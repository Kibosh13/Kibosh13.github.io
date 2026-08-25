"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "../actions";

const initialState: ActionState = {};

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(loginAction, initialState);
  return (
    <form className="cms-login-form" action={action}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="cms-field">
        <label htmlFor="email">Электронная почта</label>
        <input className="cms-input" id="email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="cms-field">
        <label htmlFor="password">Пароль</label>
        <input className="cms-input" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state.error ? <div className="cms-alert error" role="alert">{state.error}</div> : null}
      <button className="cms-button" type="submit" disabled={pending}>{pending ? "Входим…" : "Войти"}</button>
    </form>
  );
}
