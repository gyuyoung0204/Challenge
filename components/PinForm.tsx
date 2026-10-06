"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";

export default function PinForm({ next = "/admin", message = "인증 기록 입력·수정은 관리자만 가능합니다." }: { next?: string; message?: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card mx-auto mt-10 max-w-xs text-center">
      <div className="text-4xl">🔐</div>
      <h1 className="mt-2 text-lg font-bold">관리자 PIN</h1>
      <p className="mt-1 text-xs text-zinc-500">{message}</p>
      <input type="hidden" name="next" value={next} />
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        autoComplete="off"
        autoFocus
        required
        className="input mt-4 text-center text-2xl tracking-[0.5em]"
      />
      {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
      <button disabled={pending} className="btn-primary mt-4 w-full">
        {pending ? "확인 중…" : "확인"}
      </button>
    </form>
  );
}
