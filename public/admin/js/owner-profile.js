(() => {
  const input = document.getElementById("ownerAvatarInput");
  const img = document.getElementById("ownerAvatarPreview");
  if (!input || !img) return;

  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    img.src = url;

    const headerAvatar = document.querySelector(".sz-header .sz-user img");
    if (headerAvatar) headerAvatar.src = url;
  });
})();
