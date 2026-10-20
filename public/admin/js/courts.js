//cchage status
console.log("ok");
const btnChange = document.querySelectorAll(".btn");
console.log(btnChange);
if (btnChange) {
  const form = document.querySelector("#form-changeStatus");

if(form){
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

//end change button courts
//preview many image
const wrap = document.querySelector("[upload-images]");
if (wrap) {
  const input = wrap.querySelector("[upload-images-input]");
  const grid = document.getElementById("courtImagePreview");
  const drop = grid.querySelector(".fv-image-drop");
  const MAX = 6;

  input.addEventListener("change", () => {
    const files = [...input.files].slice(0, MAX);

    grid.querySelectorAll(".fv-image-thumb").forEach((el) => el.remove());

    if (!files.length) {
      if (drop) drop.hidden = false;
      return;
    }

    if (drop) drop.hidden = true;

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const thumb = document.createElement("div");
      thumb.className = "fv-image-thumb";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;

      thumb.appendChild(img);
      grid.appendChild(thumb);
    });
  });
}

//end preview many image
