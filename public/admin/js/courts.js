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
    url.searchParams.delete("page");
    window.location.href = url.href;
  });
}
//end filter courts
//change button Courts

//end change button courts
//preview many image (create + edit)
const wrap = document.querySelector("[upload-images]");
if (wrap) {
  const input = wrap.querySelector("[upload-images-input]");
  const grid = document.getElementById("courtImagePreview");
  const drop = grid.querySelector(".fv-image-drop");
  const MAX = 6;
  const isEdit = wrap.hasAttribute("data-edit");
  let newFiles = [];

  function countThumbs() {
    return grid.querySelectorAll(".fv-image-thumb").length;
  }

  function syncDrop() {
    if (!drop) return;
    const has = countThumbs() > 0;
    drop.hidden = has;
    drop.classList.toggle("is-hidden", has);
  }

  function syncInputFiles() {
    const dt = new DataTransfer();
    newFiles.forEach((file) => dt.items.add(file));
    input.files = dt.files;
  }

  function reindexNewThumbs() {
    grid.querySelectorAll(".fv-image-thumb[data-new-index]").forEach((el, i) => {
      el.dataset.newIndex = String(i);
    });
  }

  function makeThumb({ src, existingUrl, fileIndex }) {
    const thumb = document.createElement("div");
    thumb.className = "fv-image-thumb";

    if (existingUrl) {
      thumb.dataset.existing = "1";
    } else {
      thumb.dataset.newIndex = String(fileIndex);
    }

    const img = document.createElement("img");
    img.src = src;
    img.alt = "";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fv-image-remove";
    btn.setAttribute("aria-label", "Xóa ảnh");
    btn.textContent = "×";

    thumb.appendChild(img);
    thumb.appendChild(btn);

    if (existingUrl) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.name = "keep_image_urls";
      hidden.value = existingUrl;
      thumb.appendChild(hidden);
    }

    return thumb;
  }

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".fv-image-remove");
    if (!btn) return;

    const thumb = btn.closest(".fv-image-thumb");
    if (!thumb) return;

    if (thumb.dataset.existing) {
      thumb.remove();
    } else {
      const idx = Number(thumb.dataset.newIndex);
      newFiles.splice(idx, 1);
      thumb.remove();
      reindexNewThumbs();
      syncInputFiles();
    }

    syncDrop();
  });

  input.addEventListener("change", () => {
    if (!isEdit) {
      grid.querySelectorAll(".fv-image-thumb").forEach((el) => el.remove());
      newFiles = [];
    }

    const remain = MAX - countThumbs();
    const picked = [...input.files].slice(0, Math.max(0, remain));

    picked.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const index = newFiles.length;
      newFiles.push(file);
      grid.appendChild(
        makeThumb({
          src: URL.createObjectURL(file),
          fileIndex: index,
        }),
      );
    });

    syncInputFiles();
    syncDrop();
  });

  syncDrop();
}
//end preview many image
