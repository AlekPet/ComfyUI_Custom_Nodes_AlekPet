// Make modal window
function makeModal(title, text, type = "info") {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    display: "none",
    position: "fixed",
    background: "rgba(0 0 0 / 0.8)",
    opacity: 0,
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    zIndex: "500",
    transition: "all .8s",
    cursor: "pointer",
  });

  const boxModal = document.createElement("div");
  Object.assign(boxModal.style, {
    transition: "all 0.5s",
    opacity: 0,
    display: "none",
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    background: "#525252",
    maxWidth: "20rem",
    fontFamily: "sans-serif",
    zIndex: "501",
    border: "1px solid rgb(255 255 255 / 45%)",
  });

  boxModal.className = "alekpet_modal_window";
  const boxModalHtml = `
    <div class="alekpet_modal_header" style="display: flex;  align-items: center;  background: #222;  width: 100%;justify-content: center;">
      <div class="alekpet_modal_title" style="flex-basis: 85%; text-align: center;padding: 8px;">${title}</div>
      <div class="alekpet_modal_close">✕</div>
    </div>
    <div class="alekpet_modal_description" style="padding: 10px;">${text}</div>`;
  boxModal.innerHTML = boxModalHtml;

  const alekpet_modal_header = boxModal.querySelector(".alekpet_modal_header");
  Object.assign(alekpet_modal_header.style, {
    display: "flex",
    alignItems: "center",
  });

  const close = boxModal.querySelector(".alekpet_modal_close");
  Object.assign(close.style, {
    cursor: "pointer",
  });

  document.body.appendChild(overlay);
  document.body.appendChild(boxModal);

  const removeEvent = new Event("removeElements");
  const remove = () => {
    showHide(boxModal, { opacity: 0 }).then(() =>
      showHide(overlay, { opacity: 0 }).then(() => {
        document.body.removeChild(boxModal);
        document.body.removeChild(overlay);
      })
    );
  };

  boxModal.addEventListener("removeElements", remove);
  overlay.addEventListener("removeElements", remove);

  showHide(overlay)
    .then(() => {
      overlay.addEventListener("click", () => {
        overlay.dispatchEvent(removeEvent);
      });
      showHide(boxModal);
    })
    .then(() =>
      boxModal
        .querySelector(".alekpet_modal_close")
        .addEventListener("click", () => boxModal.dispatchEvent(removeEvent))
    );
}

function showHide(
  el,
  props = { opacity: 1 },
  preStyles = { display: "block" }
) {
  Object.assign(el.style, preStyles);
  return new Promise((res) => {
    setTimeout(() => {
      Object.assign(el.style, props);
      el.addEventListener("transitionend", function transend() {
        el.removeEventListener("transitionend", transend);
        res(el);
      });
    }, 100);
  });
}

export { makeModal, showHide };
