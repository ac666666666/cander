import bgc2 from "@/assets/images/bgc2.png";
import SafeAreaThemedView from "@/components/safe-area-view";
import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { credentials } from "@/constants/config";
import { Colors } from "@/constants/theme";
import { useAppThemeStore } from "@/hooks/use-app-theme";
import { useChecklistStore } from "@/hooks/useChecklist";
import { useEventsStore } from "@/hooks/useEvents";
import dayjs from "dayjs";
import Constants from "expo-constants";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import {
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

export default function CourseTab() {
  const theme = useAppThemeStore((s) => s.theme);
  const palette = Colors[theme];
  const [messages, setMessages] = useState<
    { id: string; role: "assistant" | "user"; text: string }[]
  >([
    {
      id: "m1",
      role: "assistant",
      text: "你好！我是 Canlder 智能助手 🤖。我可以帮你管理日程、查询待办清单，或者根据你的任务优先级提供建议。试着问我“今天有什么安排？”或“有哪些高优先级任务？”",
    },
  ]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [credOpen, setCredOpen] = useState(false);
  const [appidInput, setAppidInput] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [zhipuKeyInput, setZhipuKeyInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resultRef = useRef<{ final: string; temp: string }>({
    final: "",
    temp: "",
  });
  const pendingBytesRef = useRef<Uint8Array>(new Uint8Array(0));
  const serviceRef = useRef<"iat" | "rtasr">("iat");
  const sendingRef = useRef(false);
  const lastSendTsRef = useRef(0);
  const lastStartTsRef = useRef(0);
  const textUpdateTimerRef = useRef<any>(null);
  const pendingTextRef = useRef("");

  const todos = useChecklistStore((s) => s.items);
  const events = useEventsStore((s) => s.events);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const appid = p.get("xf_appid") || "";
    const apiKey = p.get("xf_api_key") || "";
    const apiSecret = p.get("xf_api_secret") || "";
    const zhipuKey = p.get("zhipu_api_key") || p.get("zf_api_key") || "";
    if (appid) localStorage.setItem("xf_appid", appid);
    if (apiKey) localStorage.setItem("xf_api_key", apiKey);
    if (apiSecret) localStorage.setItem("xf_api_secret", apiSecret);
    if (zhipuKey) localStorage.setItem("zhipu_api_key", zhipuKey);
    if (appid || apiKey || apiSecret) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState(null, "", url.toString());
      const id = String(Date.now());
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", text: "已设置讯飞凭据" },
      ]);
    }
    if (zhipuKey) {
      const id2 = String(Date.now());
      setMessages((prev) => [
        ...prev,
        { id: id2, role: "assistant", text: "已设置智谱凭据" },
      ]);
    }
  }, []);

  const getZhipuKeyWeb = () => {
    if (credentials.zhipu_api_key) return credentials.zhipu_api_key;
    if (Platform.OS !== "web") return "";
    if (typeof window === "undefined") return "";
    return localStorage.getItem("zhipu_api_key") || "";
  };

  const getZhipuKeyNative = async () => {
    if (credentials.zhipu_api_key) return credentials.zhipu_api_key;
    try {
      const SecureStore = (await import("expo-secure-store")).default as any;
      const k1 = (await SecureStore.getItemAsync("zhipu_api_key")) || "";
      if (k1) return k1;
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default as any;
      const k2 = (await AsyncStorage.getItem("zhipu_api_key")) || "";
      return k2;
    } catch {
      return "";
    }
  };

  const sendToZhipu = async (content: string) => {
    const t = content.trim();
    if (!t) return;
    const now = Date.now();
    if (sendingRef.current) return;
    if (now - lastSendTsRef.current < 1200) return;
    sendingRef.current = true;
    lastSendTsRef.current = now;
    const id = String(Date.now());
    const msgsBefore = [...messages, { id, role: "user", text: t }];
    setMessages([
      ...msgsBefore,
      { id: id + "-r", role: "assistant", text: "思考中…" },
    ]);
    const key =
      Platform.OS === "web" ? getZhipuKeyWeb() : await getZhipuKeyNative();
    if (!key) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id + "-r"
            ? {
                ...m,
                text: "未检测到智谱 APIKey，请在凭据面板或 URL 设置 zhipu_api_key",
              }
            : m
        )
      );
      setText("");
      return;
    }
    try {
      const bodyMsgs = msgsBefore.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      // 构建系统提示词，注入当前的日程和待办数据
      const systemPrompt = `你是一个名为“Canlder 助手”的智能日程管理专家。当前时间是：${dayjs().format(
        "YYYY-MM-DD HH:mm:ss"
      )}。

      你的主要功能是帮助用户管理他们的时间和任务。这个应用 (Canlder) 的核心功能包括：
      1. **日历日程管理**：用户可以添加、查看和管理特定日期的事件 (Events)。
      2. **待办清单 (Checklist)**：用户可以创建待办事项，支持四象限管理 (Quadrants) 和优先级 (High/Medium/Low) 设置。
      3. **智能联动**：有截止日期的待办事项会自动显示在日历中。
      4. **完成激励**：完成任务时会有撒花特效。

      以下是用户的实时待办事项数据：
      ${JSON.stringify(
        todos.map((t) => ({
          title: t.title,
          priority: t.priority,
          done: t.done,
          deadline: t.deadline,
          quadrant: t.quadrant,
        }))
      )}
      
      以下是用户的实时日程安排数据：
      ${JSON.stringify(
        events.map((e) => ({
          title: e.title,
          start: e.start,
          end: e.end,
          location: e.location,
          allDay: e.allDay,
        }))
      )}

      请根据以上数据回答用户的问题。
      - 如果用户询问日程，请结合 start/end 时间回答，并注意区分全天事件。
      - 如果用户询问待办，请结合 priority（优先级）和 deadline（截止日期）回答。
      - 回答请亲切、自然、简洁明了，适当使用 Emoji 增加亲和力。`;

      // 将 system prompt 放在消息列表最前面
      bodyMsgs.unshift({ role: "system", content: systemPrompt });

      if (Platform.OS === "web") {
        const payload = {
          model: "glm-4.6",
          messages: bodyMsgs,
          thinking: { type: "enabled" },
          max_tokens: 65536,
          temperature: 1.0,
          stream: true,
        };
        const res = await fetch(
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + key,
              Accept: "text/event-stream",
            },
            body: JSON.stringify(payload),
          }
        );
        let acc = "";
        let done = false;
        const dec = new TextDecoder("utf-8");
        if (res.body) {
          const reader = res.body.getReader();
          while (!done) {
            const { value, done: rdDone } = await reader.read();
            if (rdDone) break;
            acc += dec.decode(value, { stream: true });
            let lineEnd = acc.indexOf("\n");
            while (lineEnd >= 0) {
              const line = acc.slice(0, lineEnd).trim();
              acc = acc.slice(lineEnd + 1);
              if (line.startsWith("data:")) {
                const payloadStr = line.slice(5).trim();
                if (payloadStr === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const obj = JSON.parse(payloadStr);
                  let piece = "";
                  try {
                    if (obj && obj.choices && obj.choices[0]) {
                      if (obj.choices[0].delta && obj.choices[0].delta.content)
                        piece = String(obj.choices[0].delta.content);
                      else if (
                        obj.choices[0].message &&
                        obj.choices[0].message.content
                      )
                        piece = String(obj.choices[0].message.content);
                    } else if (obj && obj.output_text) {
                      piece = String(obj.output_text);
                    } else if (
                      obj &&
                      obj.data &&
                      obj.data.choices &&
                      obj.data.choices[0] &&
                      obj.data.choices[0].content
                    ) {
                      piece = String(obj.data.choices[0].content);
                    }
                  } catch {}
                  if (piece) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === id + "-r"
                          ? {
                              ...m,
                              text:
                                (m.text === "思考中…" ? "" : m.text) + piece,
                            }
                          : m
                      )
                    );
                  }
                } catch {}
              }
              lineEnd = acc.indexOf("\n");
            }
          }
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === id + "-r"
              ? { ...m, text: m.text === "思考中…" ? "" : m.text }
              : m
          )
        );
      } else {
        const payload = {
          model: "glm-4.6",
          messages: bodyMsgs,
          max_tokens: 65536,
          temperature: 1.0,
        };
        const res = await fetch(
          "https://open.bigmodel.cn/api/paas/v4/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + key,
            },
            body: JSON.stringify(payload),
          }
        );
        const data = await res.json();
        let reply = "";
        try {
          if (
            data &&
            data.choices &&
            data.choices[0] &&
            data.choices[0].message &&
            data.choices[0].message.content
          ) {
            reply = String(data.choices[0].message.content);
          } else if (data && data.output_text) {
            reply = String(data.output_text);
          } else if (
            data &&
            data.data &&
            data.data.choices &&
            data.data.choices[0] &&
            data.data.choices[0].content
          ) {
            reply = String(data.data.choices[0].content);
          }
        } catch {}
        if (!reply) reply = "未获取到有效回复";
        setMessages((prev) =>
          prev.map((m) => (m.id === id + "-r" ? { ...m, text: reply } : m))
        );
      }
    } catch (e) {
      const msg = (e as Error).message || "调用失败";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id + "-r" ? { ...m, text: "调用失败：" + msg } : m
        )
      );
    } finally {
      setText("");
      sendingRef.current = false;
    }
  };

  const send = () => {
    const t = text.trim();
    if (!t) return;
    sendToZhipu(t);
  };

  const toBase64 = (buffer: Uint8Array) => {
    let binary = "";
    for (let i = 0; i < buffer.length; i++)
      binary += String.fromCharCode(buffer[i]);
    return btoa(binary);
  };

  const downsampleBuffer = (
    buffer: Float32Array,
    inRate: number,
    outRate: number
  ) => {
    if (outRate === inRate) return buffer;
    const ratio = inRate / outRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < newLength) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
      let sum = 0;
      let count = 0;
      for (
        let i = offsetBuffer;
        i < nextOffsetBuffer && i < buffer.length;
        i++
      ) {
        sum += buffer[i];
        count++;
      }
      result[offsetResult] = sum / (count || 1);
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  };

  const floatTo16BitPCM = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Uint8Array(buffer);
  };

  const appendRtasrAndMaybeSend = (bytes: Uint8Array, isLast: boolean) => {
    const pending = pendingBytesRef.current;
    const combined = new Uint8Array(pending.length + bytes.length);
    combined.set(pending);
    combined.set(bytes, pending.length);
    let offset = 0;
    while (combined.length - offset >= 1280) {
      const chunk = combined.slice(offset, offset + 1280);
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(chunk);
      }
      offset += 1280;
    }
    pendingBytesRef.current = combined.slice(offset);
    if (isLast) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ end: true }));
      }
      pendingBytesRef.current = new Uint8Array(0);
    }
  };

  const sendChunk = (status: number, bytes: Uint8Array) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          data: {
            status,
            format: "audio/L16;rate=16000",
            encoding: "raw",
            audio: toBase64(bytes),
          },
        })
      );
    }
  };

  const appendAndMaybeSend = (bytes: Uint8Array, isLast: boolean) => {
    const pending = pendingBytesRef.current;
    const combined = new Uint8Array(pending.length + bytes.length);
    combined.set(pending);
    combined.set(bytes, pending.length);
    let offset = 0;
    while (combined.length - offset >= 1280) {
      const chunk = combined.slice(offset, offset + 1280);
      sendChunk(1, chunk);
      offset += 1280;
    }
    pendingBytesRef.current = combined.slice(offset);
    if (isLast) {
      if (pendingBytesRef.current.length > 0) {
        sendChunk(2, pendingBytesRef.current);
        pendingBytesRef.current = new Uint8Array(0);
      } else {
        sendChunk(2, new Uint8Array(0));
      }
    }
  };

  const getCreds = () => {
    if (
      credentials.xf_appid &&
      credentials.xf_api_key &&
      credentials.xf_api_secret
    ) {
      return {
        appid: credentials.xf_appid,
        apiKey: credentials.xf_api_key,
        apiSecret: credentials.xf_api_secret,
      };
    }
    if (Platform.OS === "web") {
      const appid =
        typeof window !== "undefined"
          ? localStorage.getItem("xf_appid") || ""
          : "";
      const apiKey =
        typeof window !== "undefined"
          ? localStorage.getItem("xf_api_key") || ""
          : "";
      const apiSecret =
        typeof window !== "undefined"
          ? localStorage.getItem("xf_api_secret") || ""
          : "";
      return { appid, apiKey, apiSecret };
    }
    return { appid: "", apiKey: "", apiSecret: "" };
  };

  const getCredsNative = async () => {
    if (
      credentials.xf_appid &&
      credentials.xf_api_key &&
      credentials.xf_api_secret
    ) {
      return {
        appid: credentials.xf_appid,
        apiKey: credentials.xf_api_key,
        apiSecret: credentials.xf_api_secret,
      };
    }
    try {
      const SecureStore = (await import("expo-secure-store")).default as any;
      const appid = (await SecureStore.getItemAsync("xf_appid")) || "";
      const apiKey = (await SecureStore.getItemAsync("xf_api_key")) || "";
      const apiSecret = (await SecureStore.getItemAsync("xf_api_secret")) || "";
      if (appid && apiKey && apiSecret) return { appid, apiKey, apiSecret };
      const AsyncStorage = (
        await import("@react-native-async-storage/async-storage")
      ).default as any;
      const appid2 = (await AsyncStorage.getItem("xf_appid")) || "";
      const apiKey2 = (await AsyncStorage.getItem("xf_api_key")) || "";
      const apiSecret2 = (await AsyncStorage.getItem("xf_api_secret")) || "";
      return {
        appid: appid || appid2,
        apiKey: apiKey || apiKey2,
        apiSecret: apiSecret || apiSecret2,
      };
    } catch {
      return { appid: "", apiKey: "", apiSecret: "" };
    }
  };

  const hmacSha256Base64 = async (secret: string, data: string) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const bytes = new Uint8Array(sig);
    let binary = "";
    for (let i = 0; i < bytes.length; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const md5Hex = (str: string) => {
    const utf8 = new TextEncoder().encode(str);
    const rhex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
    const add = (x: number, y: number) => ((x + y) & 0xffffffff) >>> 0;
    const rol = (num: number, cnt: number) =>
      ((num << cnt) | (num >>> (32 - cnt))) & 0xffffffff;
    const cmn = (
      q: number,
      a: number,
      b: number,
      x: number,
      s: number,
      t: number
    ) => add(rol(add(add(a, q), add(x, t)), s), b);
    const ff = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      t: number
    ) => cmn((b & c) | (~b & d), a, b, x, s, t);
    const gg = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      t: number
    ) => cmn((b & d) | (c & ~d), a, b, x, s, t);
    const hh = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      t: number
    ) => cmn(b ^ c ^ d, a, b, x, s, t);
    const ii = (
      a: number,
      b: number,
      c: number,
      d: number,
      x: number,
      s: number,
      t: number
    ) => cmn(c ^ (b | ~d), a, b, x, s, t);
    const bytes = new Uint8Array(((utf8.length + 9 + 63) >> 6) * 64);
    bytes.set(utf8);
    bytes[utf8.length] = 0x80;
    const bitLen = utf8.length * 8;
    bytes[bytes.length - 8] = bitLen & 0xff;
    bytes[bytes.length - 7] = (bitLen >>> 8) & 0xff;
    bytes[bytes.length - 6] = (bitLen >>> 16) & 0xff;
    bytes[bytes.length - 5] = (bitLen >>> 24) & 0xff;
    let a = 0x67452301;
    let b = 0xefcdab89;
    let c = 0x98badcfe;
    let d = 0x10325476;
    for (let i = 0; i < bytes.length; i += 64) {
      const x: number[] = [];
      for (let j = 0; j < 64; j += 4) {
        x[j >> 2] =
          bytes[i + j] |
          (bytes[i + j + 1] << 8) |
          (bytes[i + j + 2] << 16) |
          (bytes[i + j + 3] << 24);
      }
      let oa = a,
        ob = b,
        oc = c,
        od = d;
      a = ff(a, b, c, d, x[0], 7, -680876936);
      d = ff(d, a, b, c, x[1], 12, -389564586);
      c = ff(c, d, a, b, x[2], 17, 606105819);
      b = ff(b, c, d, a, x[3], 22, -1044525330);
      a = ff(a, b, c, d, x[4], 7, -176418897);
      d = ff(d, a, b, c, x[5], 12, 1200080426);
      c = ff(c, d, a, b, x[6], 17, -1473231341);
      b = ff(b, c, d, a, x[7], 22, -45705983);
      a = ff(a, b, c, d, x[8], 7, 1770035416);
      d = ff(d, a, b, c, x[9], 12, -1958414417);
      c = ff(c, d, a, b, x[10], 17, -42063);
      b = ff(b, c, d, a, x[11], 22, -1990404162);
      a = ff(a, b, c, d, x[12], 7, 1804603682);
      d = ff(d, a, b, c, x[13], 12, -40341101);
      c = ff(c, d, a, b, x[14], 17, -1502002290);
      b = ff(b, c, d, a, x[15], 22, 1236535329);
      a = gg(a, b, c, d, x[1], 5, -165796510);
      d = gg(d, a, b, c, x[6], 9, -1069501632);
      c = gg(c, d, a, b, x[11], 14, 643717713);
      b = gg(b, c, d, a, x[0], 20, -373897302);
      a = gg(a, b, c, d, x[5], 5, -701558691);
      d = gg(d, a, b, c, x[10], 9, 38016083);
      c = gg(c, d, a, b, x[15], 14, -660478335);
      b = gg(b, c, d, a, x[4], 20, -405537848);
      a = gg(a, b, c, d, x[9], 5, 568446438);
      d = gg(d, a, b, c, x[14], 9, -1019803690);
      c = gg(c, d, a, b, x[3], 14, -187363961);
      b = gg(b, c, d, a, x[8], 20, 1163531501);
      a = gg(a, b, c, d, x[13], 5, -1444681467);
      d = gg(d, a, b, c, x[2], 9, -51403784);
      c = gg(c, d, a, b, x[7], 14, 1735328473);
      b = gg(b, c, d, a, x[12], 20, -1926607734);
      a = hh(a, b, c, d, x[5], 4, -378558);
      d = hh(d, a, b, c, x[8], 11, -2022574463);
      c = hh(c, d, a, b, x[11], 16, 1839030562);
      b = hh(b, c, d, a, x[14], 23, -35309556);
      a = hh(a, b, c, d, x[1], 4, -1530992060);
      d = hh(d, a, b, c, x[4], 11, 1272893353);
      c = hh(c, d, a, b, x[7], 16, -155497632);
      b = hh(b, c, d, a, x[10], 23, -1094730640);
      a = hh(a, b, c, d, x[13], 4, 681279174);
      d = hh(d, a, b, c, x[0], 11, -358537222);
      c = hh(c, d, a, b, x[3], 16, -722521979);
      b = hh(b, c, d, a, x[6], 23, 76029189);
      a = ii(a, b, c, d, x[0], 6, -198630844);
      d = ii(d, a, b, c, x[7], 10, 1126891415);
      c = ii(c, d, a, b, x[14], 15, -1416354905);
      b = ii(b, c, d, a, x[5], 21, -57434055);
      a = ii(a, b, c, d, x[12], 6, 1700485571);
      d = ii(d, a, b, c, x[3], 10, -1894986606);
      c = ii(c, d, a, b, x[10], 15, -1051523);
      b = ii(b, c, d, a, x[1], 21, -205492279);
      a = ii(a, b, c, d, x[8], 6, 1873313359);
      d = ii(d, a, b, c, x[15], 10, -30611744);
      c = ii(c, d, a, b, x[6], 15, -1560198380);
      b = ii(b, c, d, a, x[13], 21, 1309151649);
      a = add(a, oa);
      b = add(b, ob);
      c = add(c, oc);
      d = add(d, od);
    }
    const out = new Uint8Array(16);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, a, true);
    dv.setUint32(4, b, true);
    dv.setUint32(8, c, true);
    dv.setUint32(12, d, true);
    let hex = "";
    for (let i = 0; i < out.length; i++)
      hex += out[i].toString(16).padStart(2, "0");
    return hex;
  };

  const hmacSha1Base64Fallback = (keyStr: string, msgStr: string) => {
    const te = new TextEncoder();
    const key = te.encode(keyStr);
    const msg = te.encode(msgStr);
    const blockSize = 64;
    let k = key;
    const sha1 = (data: Uint8Array) => {
      const toUint32 = (arr: Uint8Array) => {
        const words: number[] = [];
        for (let i = 0; i < arr.length; i += 4) {
          words.push(
            (arr[i] << 24) | (arr[i + 1] << 16) | (arr[i + 2] << 8) | arr[i + 3]
          );
        }
        return words;
      };
      const rotr = (n: number, b: number) =>
        (n >>> b) | ((n << (32 - b)) & 0xffffffff);
      const padLen = ((data.length + 9 + 63) >> 6) * 64;
      const buf = new Uint8Array(padLen);
      buf.set(data);
      buf[data.length] = 0x80;
      const bitLen = data.length * 8;
      const dv = new DataView(buf.buffer);
      dv.setUint32(buf.length - 4, bitLen, false);
      let h0 = 0x67452301;
      let h1 = 0xefcdab89;
      let h2 = 0x98badcfe;
      let h3 = 0x10325476;
      let h4 = 0xc3d2e1f0;
      for (let i = 0; i < buf.length; i += 64) {
        const w = new Array<number>(80);
        for (let j = 0; j < 16; j++) {
          w[j] = dv.getUint32(i + j * 4, false);
        }
        for (let j = 16; j < 80; j++) {
          w[j] = rotr(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        }
        let a = h0,
          b = h1,
          c = h2,
          d = h3,
          e = h4;
        for (let j = 0; j < 80; j++) {
          const s = Math.floor(j / 20);
          const f =
            s === 0
              ? (b & c) | (~b & d)
              : s === 1
              ? b ^ c ^ d
              : s === 2
              ? (b & c) | (b ^ d) | (c ^ d)
              : b ^ c ^ d;
          const kconst =
            s === 0
              ? 0x5a827999
              : s === 1
              ? 0x6ed9eba1
              : s === 2
              ? 0x8f1bbcdc
              : 0xca62c1d6;
          const temp = ((a << 5) | (a >>> 27)) + f + e + kconst + (w[j] >>> 0);
          e = d;
          d = c;
          c = (b << 30) | (b >>> 2);
          b = a;
          a = temp >>> 0;
        }
        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
      }
      const out = new Uint8Array(20);
      const dv2 = new DataView(out.buffer);
      dv2.setUint32(0, h0, false);
      dv2.setUint32(4, h1, false);
      dv2.setUint32(8, h2, false);
      dv2.setUint32(12, h3, false);
      dv2.setUint32(16, h4, false);
      return out;
    };
    if (k.length > blockSize) k = sha1(k);
    const o = new Uint8Array(blockSize);
    const i = new Uint8Array(blockSize);
    for (let idx = 0; idx < blockSize; idx++) {
      const kc = k[idx] || 0;
      o[idx] = kc ^ 0x5c;
      i[idx] = kc ^ 0x36;
    }
    const inner = sha1(new Uint8Array([...i, ...msg]));
    const outer = sha1(new Uint8Array([...o, ...inner]));
    let binary = "";
    for (let bi = 0; bi < outer.length; bi++)
      binary += String.fromCharCode(outer[bi]);
    return btoa(binary);
  };

  const hmacSha1Base64 = async (key: string, data: string) => {
    try {
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const enc = new TextEncoder();
        const k = await crypto.subtle.importKey(
          "raw",
          enc.encode(key),
          { name: "HMAC", hash: "SHA-1" },
          false,
          ["sign"]
        );
        const sig = await crypto.subtle.sign("HMAC", k, enc.encode(data));
        const bytes = new Uint8Array(sig);
        let binary = "";
        for (let i = 0; i < bytes.length; i++)
          binary += String.fromCharCode(bytes[i]);
        return btoa(binary);
      }
      return hmacSha1Base64Fallback(key, data);
    } catch {
      return hmacSha1Base64Fallback(key, data);
    }
  };

  const getWebSocketUrl = async (apiKey: string, apiSecret: string) => {
    const url = "wss://iat-api.xfyun.cn/v2/iat";
    const host = "iat-api.xfyun.cn";
    const date = new Date().toGMTString();
    const algorithm = "hmac-sha256";
    const headers = "host date request-line";
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
    const signature = await hmacSha256Base64(apiSecret, signatureOrigin);
    const authorizationOrigin = `api_key="${apiKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
    const authorization = btoa(authorizationOrigin);
    return `${url}?authorization=${authorization}&date=${encodeURIComponent(
      date
    )}&host=${host}`;
  };

  const getRtasrWebSocketUrl = async (appid: string, apiKey: string) => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const base = appid + ts;
    const md5 = md5Hex(base);
    const signa = await hmacSha1Base64(apiKey, md5);
    const qs = `appid=${encodeURIComponent(appid)}&ts=${encodeURIComponent(
      ts
    )}&signa=${encodeURIComponent(signa)}`;
    return `wss://rtasr.xfyun.cn/v1/ws?${qs}`;
  };

  const renderResult = (resultData: string) => {
    try {
      const jsonData = JSON.parse(resultData);
      if (jsonData.data && jsonData.data.result) {
        const data = jsonData.data.result;
        let str = "";
        const ws = data.ws;
        for (let i = 0; i < ws.length; i++) {
          str = str + ws[i].cw[0].w;
        }
        if (data.pgs) {
          if (data.pgs === "apd") {
            resultRef.current.final = resultRef.current.temp;
          }
          resultRef.current.temp = resultRef.current.final + str;
        } else {
          resultRef.current.final = resultRef.current.final + str;
        }
      }
      if (jsonData.code === 0 && jsonData.data && jsonData.data.status === 2) {
        if (wsRef.current) wsRef.current.close();
      }
      if (jsonData.code !== 0) {
        if (wsRef.current) wsRef.current.close();
      }
    } catch {}
  };

  const renderRtasrResult = (resultData: string) => {
    try {
      const msg = JSON.parse(resultData);
      if (msg.action === "result" && typeof msg.data === "string") {
        const dataObj = JSON.parse(msg.data);
        const st = dataObj.cn && dataObj.cn.st;
        if (st && Array.isArray(st.rt)) {
          let str = "";
          const rtArr = st.rt;
          for (let i = 0; i < rtArr.length; i++) {
            const ws = rtArr[i].ws || [];
            for (let j = 0; j < ws.length; j++) {
              const cw = ws[j].cw || [];
              if (cw[0] && cw[0].w) str += cw[0].w;
            }
          }
          const typ = st.type;
          if (typ === "1" || typ === 1) {
            resultRef.current.temp = resultRef.current.final + str;
          } else {
            resultRef.current.final = resultRef.current.final + str;
            resultRef.current.temp = resultRef.current.final;
          }
          scheduleTextUpdate(resultRef.current.temp || resultRef.current.final);
        }
      }
      if (msg.action === "error") {
        if (wsRef.current) wsRef.current.close();
      }
    } catch {}
  };

  const startRecordWeb = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;
    const { appid, apiKey } = getCreds();
    if (!appid || !apiKey) {
      const id = String(Date.now());
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "assistant",
          text: "请先设置讯飞凭据：localStorage 设定 xf_appid/xf_api_key",
        },
      ]);
      return;
    }
    resultRef.current = { final: "", temp: "" };
    pendingBytesRef.current = new Uint8Array(0);
    const websocketUrl = await getRtasrWebSocketUrl(appid, apiKey);
    const ws = new WebSocket(websocketUrl);
    wsRef.current = ws;
    ws.onopen = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      audioCtxRef.current = ac;
      const source = ac.createMediaStreamSource(stream);
      const processor = ac.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const down = downsampleBuffer(input, ac.sampleRate, 16000);
        const pcm = floatTo16BitPCM(down);
        appendRtasrAndMaybeSend(pcm, false);
      };
      source.connect(processor);
      processor.connect(ac.destination);
      setRecording(true);
    };
    ws.onmessage = (e) => renderRtasrResult(e.data as string);
    ws.onerror = () => {
      setRecording(false);
    };
    ws.onclose = () => {
      setRecording(false);
      const finalText = resultRef.current.temp || resultRef.current.final;
      if (finalText) sendToZhipu(finalText);
    };
    serviceRef.current = "rtasr";
  };

  const startRecordNative = async () => {
    const id = String(Date.now());
    if (Constants?.appOwnership === "expo") {
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "assistant",
          text: "当前运行环境为 Expo Go，原生流式录音不可用。请使用 Dev Client（npx expo run:android）后再试。",
        },
      ]);
      return;
    }
    const { appid, apiKey } = await getCredsNative();
    if (!appid || !apiKey) {
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", text: "请先设置讯飞凭据后再尝试原生录音" },
      ]);
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        id: id + "-ok",
        role: "assistant",
        text: "已检测到凭据，开始连接语音服务",
      },
    ]);
    try {
      const mod = await import("react-native-audio-record");
      const AudioRecord = (mod as any).default || (mod as any);
      AudioRecord.init({
        sampleRate: 16000,
        channels: 1,
        bitsPerSample: 16,
        audioSource: 6,
      });
      resultRef.current = { final: "", temp: "" };
      pendingBytesRef.current = new Uint8Array(0);
      const websocketUrl = await getRtasrWebSocketUrl(appid, apiKey);
      const ws = new WebSocket(websocketUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        try {
          if (typeof (AudioRecord as any).requestAuthorization === "function") {
            (AudioRecord as any).requestAuthorization();
          }
        } catch {}
        AudioRecord.on("data", (data: string) => {
          const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
          appendRtasrAndMaybeSend(bytes, false);
        });
        AudioRecord.start();
        setRecording(true);
      };
      ws.onmessage = (e) => renderRtasrResult(e.data as string);
      ws.onerror = () => setRecording(false);
      ws.onclose = () => {
        setRecording(false);
        const finalText = resultRef.current.temp || resultRef.current.final;
        if (finalText) sendToZhipu(finalText);
      };
      serviceRef.current = "rtasr";
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id,
          role: "assistant",
          text: "原生录音依赖未可用，请使用 Expo Dev Client 构建原生应用后再试",
        },
      ]);
    }
  };

  const startRecord = async () => {
    const now = Date.now();
    if (recording) return;
    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN ||
        wsRef.current.readyState === WebSocket.CONNECTING)
    )
      return;
    if (now - lastStartTsRef.current < 1000) return;
    lastStartTsRef.current = now;
    if (Platform.OS === "web") return startRecordWeb();
    return startRecordNative();
  };

  const stopRecord = () => {
    if (processorRef.current && audioCtxRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {}
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      streamRef.current = null;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (serviceRef.current === "rtasr") {
        appendRtasrAndMaybeSend(new Uint8Array(0), true);
      } else {
        appendAndMaybeSend(new Uint8Array(0), true);
      }
    }
    if (Platform.OS !== "web") {
      import("react-native-audio-record")
        .then((mod) => {
          const AudioRecord = (mod as any).default || (mod as any);
          try {
            AudioRecord.stop();
          } catch {}
        })
        .catch(() => {});
    }
  };

  const scheduleTextUpdate = (v: string) => {
    pendingTextRef.current = v;
    if (textUpdateTimerRef.current) return;
    textUpdateTimerRef.current = setTimeout(() => {
      const out = pendingTextRef.current;
      setText(out);
      textUpdateTimerRef.current = null;
    }, 120);
  };

  const saveCreds = async () => {
    const id = String(Date.now());
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        if (appidInput) localStorage.setItem("xf_appid", appidInput);
        if (apiKeyInput) localStorage.setItem("xf_api_key", apiKeyInput);
        if (apiSecretInput)
          localStorage.setItem("xf_api_secret", apiSecretInput);
        if (zhipuKeyInput) localStorage.setItem("zhipu_api_key", zhipuKeyInput);
      }
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", text: "已设置凭据" },
      ]);
      setCredOpen(false);
      return;
    }
    try {
      const SecureStore = (await import("expo-secure-store")).default as any;
      if (appidInput) await SecureStore.setItemAsync("xf_appid", appidInput);
      if (apiKeyInput)
        await SecureStore.setItemAsync("xf_api_key", apiKeyInput);
      if (apiSecretInput)
        await SecureStore.setItemAsync("xf_api_secret", apiSecretInput);
      if (zhipuKeyInput)
        await SecureStore.setItemAsync("zhipu_api_key", zhipuKeyInput);
      setMessages((prev) => [
        ...prev,
        { id, role: "assistant", text: "已设置凭据" },
      ]);
      setCredOpen(false);
    } catch {
      try {
        const AsyncStorage = (
          await import("@react-native-async-storage/async-storage")
        ).default as any;
        if (appidInput) await AsyncStorage.setItem("xf_appid", appidInput);
        if (apiKeyInput) await AsyncStorage.setItem("xf_api_key", apiKeyInput);
        if (apiSecretInput)
          await AsyncStorage.setItem("xf_api_secret", apiSecretInput);
        if (zhipuKeyInput)
          await AsyncStorage.setItem("zhipu_api_key", zhipuKeyInput);
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", text: "已设置凭据" },
        ]);
        setCredOpen(false);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id, role: "assistant", text: "保存凭据失败，请稍后重试" },
        ]);
      }
    }
  };

  useEffect(() => {
    const loadCreds = async () => {
      if (!credOpen) return;

      // Load from config first
      if (credentials.xf_appid) setAppidInput(credentials.xf_appid);
      if (credentials.xf_api_key) setApiKeyInput(credentials.xf_api_key);
      if (credentials.xf_api_secret)
        setApiSecretInput(credentials.xf_api_secret);
      if (credentials.zhipu_api_key)
        setZhipuKeyInput(credentials.zhipu_api_key);

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          if (!credentials.xf_appid)
            setAppidInput(localStorage.getItem("xf_appid") || "");
          if (!credentials.xf_api_key)
            setApiKeyInput(localStorage.getItem("xf_api_key") || "");
          if (!credentials.xf_api_secret)
            setApiSecretInput(localStorage.getItem("xf_api_secret") || "");
          if (!credentials.zhipu_api_key)
            setZhipuKeyInput(localStorage.getItem("zhipu_api_key") || "");
        }
        return;
      }
      const { appid, apiKey, apiSecret } = await getCredsNative();
      // If config provided these, getCredsNative returned them. If not, it returned from storage.
      // So we can just set them (overwriting the "config check" above is fine as they should be same or storage fallback)
      setAppidInput(appid);
      setApiKeyInput(apiKey);
      setApiSecretInput(apiSecret);

      const zKey = await getZhipuKeyNative();
      setZhipuKeyInput(zKey);
    };
    loadCreds();
  }, [credOpen]);

  return (
    <SafeAreaThemedView style={styles.container}>
      <ImageBackground
        source={bgc2}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.topBar}>
        <ThemedText type="subtitle" style={{ fontSize: 20 }}>
          AI 助手
        </ThemedText>
        <Pressable
          onPress={() => setRecording((v) => !v)}
          style={[
            styles.iconBtn,
            {
              borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb",
              backgroundColor: palette.tint + "15",
            },
          ]}
          android_ripple={{ color: palette.tint + "55" }}
        >
          <IconSymbol name="mic.fill" color={palette.icon} size={20} />
          <ThemedText style={{ fontSize: 14 }}>
            {recording ? "录音中" : "语音"}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setCredOpen((v) => !v)}
          style={[
            styles.iconBtn,
            {
              borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb",
              backgroundColor: palette.tint + "15",
            },
          ]}
          android_ripple={{ color: palette.tint + "55" }}
        >
          <IconSymbol name="lock.fill" color={palette.icon} size={20} />
          <ThemedText style={{ fontSize: 14 }}>凭据</ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ gap: 10 }} style={{ flex: 1 }}>
        {messages.map((m) => (
          <Pressable
            key={m.id}
            style={[
              styles.bubble,
              m.role === "assistant"
                ? {
                    alignSelf: "flex-start",
                    backgroundColor: theme === "dark" ? "#1b1e20" : "#f4f4f5",
                  }
                : {
                    alignSelf: "flex-end",
                    backgroundColor: palette.tint + "15",
                  },
            ]}
            onPress={() => {
              if (m.role === "assistant") {
                Speech.speak(m.text, { language: "zh-CN" });
              }
            }}
            android_ripple={{ color: palette.tint + "33" }}
          >
            <ThemedText style={{ fontSize: 14 }}>{m.text}</ThemedText>
          </Pressable>
        ))}
        {credOpen && (
          <View
            style={[
              styles.bubble,
              {
                alignSelf: "stretch",
                backgroundColor: theme === "dark" ? "#1b1e20" : "#f4f4f5",
              },
            ]}
          >
            <ThemedText style={{ fontSize: 14 }}>
              Websocket服务接口认证信息
            </ThemedText>
            <TextInput
              value={appidInput}
              onChangeText={setAppidInput}
              placeholder="APPID"
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginTop: 8,
              }}
            />
            <TextInput
              value={apiSecretInput}
              onChangeText={setApiSecretInput}
              placeholder="APISecret"
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginTop: 8,
              }}
            />
            <TextInput
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              placeholder="APIKey"
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginTop: 8,
              }}
            />
            <ThemedText style={{ fontSize: 14, marginTop: 12 }}>
              智谱 APIKey
            </ThemedText>
            <TextInput
              value={zhipuKeyInput}
              onChangeText={setZhipuKeyInput}
              placeholder="zhipu_api_key"
              style={{
                borderWidth: 1,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                marginTop: 8,
              }}
            />
            <Pressable
              onPress={saveCreds}
              style={[
                styles.sendBtn,
                {
                  borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb",
                  alignSelf: "flex-end",
                  marginTop: 10,
                },
              ]}
              android_ripple={{ color: palette.tint + "55" }}
            >
              <IconSymbol
                name="checkmark.circle.fill"
                color={palette.icon}
                size={18}
              />
              <ThemedText style={{ fontSize: 14 }}>保存</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View
        style={[
          styles.inputRow,
          { borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb" },
        ]}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={recording ? "正在录音…" : "请输入消息"}
          style={styles.input}
        />
        <Pressable
          onPressIn={startRecord}
          onPressOut={stopRecord}
          style={[
            styles.sendBtn,
            { borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb" },
          ]}
          android_ripple={{ color: palette.tint + "55" }}
        >
          <IconSymbol name="mic.fill" color={palette.icon} size={18} />
          <ThemedText style={{ fontSize: 14 }}>
            {recording ? "松手结束" : "按住说话"}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={send}
          style={[
            styles.sendBtn,
            { borderColor: theme === "dark" ? "#2a2f34" : "#e5e7eb" },
          ]}
          android_ripple={{ color: palette.tint + "55" }}
        >
          <IconSymbol name="paperplane.fill" color={palette.icon} size={18} />
          <ThemedText style={{ fontSize: 14 }}>发送</ThemedText>
        </Pressable>
      </View>
    </SafeAreaThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  input: { flex: 1, paddingVertical: 0 },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
