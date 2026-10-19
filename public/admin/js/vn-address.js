(function () {
  const citySelect = document.getElementById("venueCity");
  const wardSelect = document.getElementById("venueWard");
  const city = citySelect.getAttribute("select_city");
  const ward = wardSelect.getAttribute("select_ward");
  console.log(city);
  console.log(ward);
  if (!citySelect || !wardSelect) return;
  const emptyWardOption = () => {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Chọn phường / xã --";
    return opt;
  };

  const resetWards = () => {
    wardSelect.innerHTML = "";
    wardSelect.appendChild(emptyWardOption());
    wardSelect.disabled = true;
  };

  const fillWards = (wards) => {
    resetWards();
    if (!wards || !wards.length) return;

    wards.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      console.log(opt.value + ward);
      if (opt.value == ward) {
        opt.selected = true;
      }
      wardSelect.appendChild(opt);
    });
    wardSelect.disabled = false;
  };

  const fillProvinces = (data) => {
    const provinces = Object.keys(data).sort((a, b) =>
      a.localeCompare(b, "vi"),
    );

    citySelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "-- Chọn tỉnh / thành phố --";
    citySelect.appendChild(placeholder);

    provinces.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;

      if (opt.value == city) {
        console.log(opt.value + city);
        opt.selected = true;
      }
      citySelect.appendChild(opt);
    });
  };

  resetWards();

  fetch("/admin/data/vn-address.json")
    .then((res) => {
      if (!res.ok) throw new Error("Không tải được dữ liệu địa giới");
      return res.json();
    })
    .then((data) => {
      fillProvinces(data);
      if (city && data[city]) {
        fillWards(data[city]);
      }
      citySelect.addEventListener("change", () => {
        const province = citySelect.value;
        fillWards(province ? data[province] : []);
      });
    })
    .catch((err) => {
      console.error(err);
      citySelect.innerHTML =
        '<option value="">Không tải được danh sách tỉnh/thành</option>';
      resetWards();
    });
})();
