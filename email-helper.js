const emailForm = document.querySelector("#email-helper-form");

emailForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(emailForm).entries());
  const body = [data.greeting, "", data.message, "", data.signoff].join("\n");
  const mailto = new URL(`mailto:${String(data.to).trim()}`);
  mailto.searchParams.set("subject", data.subject);
  mailto.searchParams.set("body", body);
  window.location.href = mailto.toString();
});
