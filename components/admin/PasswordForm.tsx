"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPasswordAction, initialState);
  return (
    <form className="cms-card cms-card-body cms-form-main" action={action}>
      <h2>Смена пароля</h2>
      <div className="cms-field">
        <label htmlFor="currentPassword">Текущий пароль</label>
        <input className="cms-input" id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="cms-field">
        <label htmlFor="newPassword">Новый пароль</label>
        <input className="cms-input" id="newPassword" name="password" type="password" minLength={10} autoComplete="new-password" required />
        <small>Не менее 10 символов.</small>
      </div>
      <div className="cms-field">
        <label htmlFor="passwordConfirmation">Повторите новый пароль</label>
        <input className="cms-input" id="passwordConfirmation" name="confirmation" type="password" minLength={10} autoComplete="new-password" required />
      </div>
      {state.error ? <div className="cms-alert error" role="alert">{state.error}</div> : null}
      <button className="cms-button" type="submit" disabled={pending}>{pending ? "Сохраняем…" : "Изменить пароль"}</button>
    </form>
  );
}
