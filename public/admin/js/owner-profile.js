(() => {
  const input = document.getElementById("ownerAvatarInput");
  const img = document.getElementById("ownerAvatarPreview");
  const hidden = document.getElementById("ownerAvatarUrl");
  if (!input || !img) return;

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    img.src = url;
    if (hidden) hidden.value = url;

    const headerAvatar = document.querySelector(".sz-header .sz-user img");
    if (headerAvatar) headerAvatar.src = url;
  });
})();
