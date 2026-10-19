//cchage status
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
//end change status
//filter courts
const venuesFilter = document.querySelector("#venueFilter");
console.log(venuesFilter);
if (venuesFilter) {
  let url = new URL(window.location.href);
  venuesFilter.addEventListener("change", () => {
    const optionSelect = venuesFilter.querySelector("option:checked");
    const id = optionSelect.value;
    if (id) {
      url.searchParams.set("id", id);
    } else {
      url.searchParams.delete("id");
    }
    window.location.href = url.href;
  });
}
//end filter courts
//change button Courts
