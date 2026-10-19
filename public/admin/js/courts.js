console.log("ok");
const btnChange = document.querySelectorAll(".btn");
console.log(btnChange);
if (btnChange) {
  const form = document.querySelector("#form-changeStatus");

  const path = form.getAttribute("data-path");
  console.log(path);
  btnChange.forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = btn.getAttribute("data-status");
      const id = btn.getAttribute("data-id");
      const action = `${path}/${id}/${status}?_method=PATCH`;
      form.action = action;
      form.submit();
    });
  });
}
