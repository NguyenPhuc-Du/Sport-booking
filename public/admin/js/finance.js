const btnDelete = document.querySelectorAll("[button-delete]");
console.log(btnDelete);
if (btnDelete) {
  const formDlt = document.querySelector("#form-delete");
  const path = formDlt.getAttribute("data-path");
  btnDelete.forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      const action = `${path}/${id}?_method=DELETE`;
      formDlt.action = action;
      formDlt.submit();
    });
  });
}
