"use client";

import { useActionState } from "react";
import { createUserAction, type ActionState } from "@/app/admin/actions";

const initialState: ActionState = {};

export function UserForm() {
  const [state, action, pending] = useActionState(createUserAction, initialState);
  return (
    <form className="cms-card cms-card-body cms-form-main" action={action}>
      <h2>Новый пользователь</h2>
      <div className="cms-field"><label htmlFor="displayName">Имя</label><input className="cms-input" id="displayName" name="displayName" required /></div>
      <div className="cms-field"><label htmlFor="userEmail">Почта</label><input className="cms-input" id="userEmail" name="email" type="email" required /></div>
      <div className="cms-field"><label htmlFor="userPassword">Временный пароль</label><input className="cms-input" id="userPassword" name="password" type="password" minLength={10} required /><small>Не менее 10 символов. Передайте пароль пользователю безопасным способом.</small></div>
      <div className="cms-field"><label htmlFor="role">Роль</label><select className="cms-select" id="role" name="role"><option value="editor">Редактор</option><option value="admin">Администратор</option></select></div>
      {state.error ? <div className="cms-alert error">{state.error}</div> : null}
      <button className="cms-button" type="submit" disabled={pending}>{pending ? "Создаём…" : "Создать пользователя"}</button>
    </form>
  );
}
