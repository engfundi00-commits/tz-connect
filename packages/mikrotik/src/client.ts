import { createConnection, type Socket } from "net";
import tls from "tls";
import crypto from "crypto";
import { logger } from "@tz/shared";
import type { RouterConnectionConfig, RouterOSMap } from "./controller";

// =====================================================
// RouterOS API Wire Protocol Client
// =====================================================
//
// Implements the MikroTik RouterOS API protocol (word
// framing, login, sentence-based commands) over TCP
// (port 8728) or TLS (port 8729).
//
// The API protocol is documented publicly by MikroTik:
// https://wiki.mikrotik.com/wiki/Manual:API

function encodeWord(word: string): Buffer {
  const len = Buffer.byteLength(word, "utf8");
  let prefix: Buffer;
  if (len < 0x80) {
    prefix = Buffer.from([len]);
  } else if (len < 0x4000) {
    prefix = Buffer.from([(len >> 8) | 0x80, len & 0xff]);
  } else if (len < 0x200000) {
    prefix = Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff]);
  } else {
    prefix = Buffer.from([0xe0, (len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff]);
  }
  return Buffer.concat([prefix, Buffer.from(word, "utf8")]);
}

function encodeSentence(words: string[]): Buffer {
  const parts = words.map(encodeWord);
  parts.push(encodeWord("")); // empty word terminates the sentence
  return Buffer.concat(parts);
}

function decodeWord(buf: Buffer, offset: number): { word: string; nextOffset: number } {
  const first = buf[offset];
  let len: number;
  let consumed: number;
  if (first < 0x80) {
    len = first;
    consumed = 1;
  } else if ((first & 0xc0) === 0x80) {
    len = ((first & 0x3f) << 8) | buf[offset + 1];
    consumed = 2;
  } else if ((first & 0xe0) === 0xc0) {
    len = ((first & 0x1f) << 16) | (buf[offset + 1] << 8) | buf[offset + 2];
    consumed = 3;
  } else {
    len =
      ((first & 0x1f) << 24) |
      (buf[offset + 1] << 16) |
      (buf[offset + 2] << 8) |
      buf[offset + 3];
    consumed = 4;
  }
  const word = buf.subarray(offset + consumed, offset + consumed + len).toString("utf8");
  return { word, nextOffset: offset + consumed + len };
}

export class RouterOSClient {
  private socket: Socket | null = null;
  private buffer = Buffer.alloc(0);
  private pending: {
    resolve: (sentences: RouterOSMap[]) => void;
    reject: (err: Error) => void;
  } | null = null;
  private currentTag = 0;
  private sentences: RouterOSMap[] = [];
  private expectedTag: string | null = null;

  constructor(private config: RouterConnectionConfig) {}

  async connect(): Promise<void> {
    if (this.socket && !this.socket.destroyed) return;

    const port = this.config.tls
      ? this.config.apiSecurePort ?? 8729
      : this.config.apiPort ?? 8728;

    await new Promise<void>((resolve, reject) => {
      const onError = (err: Error) => reject(err);

      if (this.config.tls) {
        const tlsSocket = tls.connect(
          { host: this.config.host, port, rejectUnauthorized: false },
          () => {
            this.attachSocket(tlsSocket);
            resolve();
          }
        );
        tlsSocket.once("error", onError);
      } else {
        const sock = createConnection({ host: this.config.host, port }, () => {
          this.attachSocket(sock);
          resolve();
        });
        sock.once("error", onError);
      }
    });

    await this.login();
  }

  private attachSocket(sock: Socket) {
    this.socket = sock;
    sock.on("data", (chunk) => this.onData(chunk));
    sock.on("error", (e) => {
      logger.error("RouterOS socket error", { error: e.message, host: this.config.host });
      if (this.pending) {
        this.pending.reject(e);
        this.pending = null;
      }
    });
    sock.on("close", () => {
      this.socket = null;
      if (this.pending) {
        this.pending.reject(new Error("RouterOS connection closed"));
        this.pending = null;
      }
    });
  }

  private onData(chunk: Buffer) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const sentence = this.tryDecodeSentence();
      if (!sentence) break;
      this.handleSentence(sentence);
    }
  }

  private tryDecodeSentence(): string[] | null {
    const words: string[] = [];
    let offset = 0;
    if (this.buffer.length === 0) return null;
    for (;;) {
      const { word, nextOffset } = decodeWord(this.buffer, offset);
      if (word === "") {
        offset = nextOffset;
        break;
      }
      words.push(word);
      offset = nextOffset;
      if (nextOffset >= this.buffer.length) {
        // Not enough bytes; wait for more
        return null;
      }
    }
    if (offset > this.buffer.length) return null;
    this.buffer = this.buffer.subarray(offset);
    return words;
  }

  private handleSentence(words: string[]) {
    if (words.length === 0) return;

    if (words[0].startsWith("!done")) {
      const tag = this.readTag(words);
      if (this.pending && (this.expectedTag === null || tag === this.expectedTag)) {
        const p = this.pending;
        this.pending = null;
        this.expectedTag = null;
        p.resolve([...this.sentences]);
        this.sentences = [];
      }
      return;
    }

    if (words[0] === "!trap" || words[0] === "!fatal") {
      const message = words.find((w) => w.startsWith("message="))?.slice("message=".length) ?? "RouterOS error";
      const tag = this.readTag(words);
      if (this.pending && (this.expectedTag === null || tag === this.expectedTag)) {
        const p = this.pending;
        this.pending = null;
        this.expectedTag = null;
        this.sentences = [];
        p.reject(new Error(message));
      }
      return;
    }

    // !re or !data — collect attribute map
    if (words[0] === "!re" || words[0] === "!data") {
      const map: RouterOSMap = {};
      for (const w of words.slice(1)) {
        const idx = w.indexOf("=");
        if (idx > 0) {
          map[w.slice(0, idx)] = w.slice(idx + 1);
        }
      }
      this.sentences.push(map);
    }
  }

  private readTag(words: string[]): string | null {
    const tag = words.find((w) => w.startsWith(".tag="));
    return tag ? tag.slice(5) : null;
  }

  private generateTag(): string {
    this.currentTag += 1;
    return `${this.currentTag}`;
  }

  private async login(): Promise<void> {
    // Use login method: send /login, read challenge, respond with
    // hashed password if challenged, else plain login.
    const res = await this.command(["/login", `=name=${this.config.username}`, `=password=${this.config.password}`]);
    // Some versions respond with a ret value (MD5 challenge token)
    const ret = res[0]?.ret;
    if (ret) {
      // Challenge response: 00 + md5(challenge + \00 + password) hex
      const challenge = Buffer.from(ret, "hex");
      const passwordBuf = Buffer.from(this.config.password, "utf8");
      const responseBuf = crypto
        .createHash("md5")
        .update(Buffer.concat([challenge, Buffer.from([0]), passwordBuf]))
        .digest();
      const responseHex = Buffer.concat([Buffer.from([0]), responseBuf]).toString("hex");
      await this.command(["/login", `=name=${this.config.username}`, `=response=${responseHex}`]);
    }
    await this.command(["/system/identity/print"]);
  }

  async command(sentence: string[]): Promise<RouterOSMap[]> {
    if (!this.socket) {
      await this.connect();
    }
    const tag = this.generateTag();
    const words = [...sentence, `.tag=${tag}`];
    return new Promise<RouterOSMap[]>((resolve, reject) => {
      this.pending = { resolve, reject };
      this.expectedTag = tag;
      this.sentences = [];
      this.socket!.write(encodeSentence(words));
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }
}
