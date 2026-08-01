import { useState, useRef, useEffect } from "react";
import { Sparkles, Download, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { useAskAssistant } from "../hooks/useAssistant";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { showToast, extractApiErrorMessage } from "../components/ui/Toast";

const SAMPLE_QUESTIONS = [
  "Who are my top 5 customers by outstanding balance?",
  "Give me a short business summary report for the last 90 days",
  "Which bag types are running low on stock?",
  "How much have I collected in the last 90 days?",
];

interface HistoryItem {
  question: string;
  answer: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SpeechRecognitionCtor: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;

export function AssistantPage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speakEnabled, setSpeakEnabled] = useState(false);
  const ask = useAskAssistant();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const voiceSupported = !!SpeechRecognitionCtor;

  const submit = async (q: string) => {
    if (!q.trim()) return;
    try {
      const answer = await ask.mutateAsync(q);
      setHistory((h) => [...h, { question: q, answer }]);
      setQuestion("");
      if (speakEnabled && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(answer);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      showToast.error(extractApiErrorMessage(err, "Could not get a response"));
    }
  };

  const startListening = () => {
    if (!voiceSupported) {
      showToast.error("Voice input isn't supported in this browser — try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setQuestion(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      showToast.error("Couldn't hear that clearly — please try again.");
    };
    recognition.onend = () => {
      setIsListening(false);
      setQuestion((current) => {
        if (current.trim()) submit(current);
        return current;
      });
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const downloadAnswer = (item: HistoryItem) => {
    const blob = new Blob([`Q: ${item.question}\n\n${item.answer}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" /> AI Assistant
        </h1>
        <button
          onClick={() => setSpeakEnabled((v) => !v)}
          title={speakEnabled ? "Answers will be read aloud" : "Answers are silent"}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {speakEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Ask about your customers, orders, collections, or stock — type, or tap the mic to speak.
      </p>

      {history.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => submit(q)}
              className="rounded-full border border-slate-300 dark:border-slate-600 px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {history.map((item, i) => (
          <Card key={i}>
            <div className="mb-2 text-sm font-semibold text-primary">You asked: {item.question}</div>
            <div className="whitespace-pre-wrap text-sm">{item.answer}</div>
            <button
              onClick={() => downloadAnswer(item)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:underline"
            >
              <Download className="h-3 w-3" /> Download as text
            </button>
          </Card>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        className="flex gap-2"
      >
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={isListening ? "Listening…" : "e.g. Which customers haven't paid in the last month?"}
          rows={2}
          className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          title={voiceSupported ? "Speak your question" : "Voice input not supported in this browser"}
          className={`self-end rounded-lg p-2.5 ${
            isListening ? "animate-pulse bg-danger text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
          }`}
        >
          {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <Button type="submit" isLoading={ask.isPending} className="self-end">
          Ask
        </Button>
      </form>
    </div>
  );
}
