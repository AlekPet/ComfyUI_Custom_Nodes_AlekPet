// Make modal window
function makeModal({
  title = "Message",
  text = "No text",
  type = "info",
  parent = null,
  stylePos = "fixed",
}) {
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    display: "none",
    position: stylePos,
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
    position: stylePos,
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    background: "#525252",
    minWidth: "300px",
    fontFamily: "sans-serif",
    zIndex: "501",
    border: "1px solid rgb(255 255 255 / 45%)",
  });

  boxModal.className = "alekpet_modal_window";

  const boxModalBody = document.createElement("div");
  Object.assign(boxModalBody.style, {
    display: "flex",
    flexDirection: "column",
    textAlign: "center",
  });

  boxModalBody.className = "alekpet_modal_body";

  const boxModalHtml = `
  <div class="alekpet_modal_header" style="display: flex;  align-items: center;  background: #222;  width: 100%;justify-content: center;">
  <div class="alekpet_modal_title" style="flex-basis: 85%; text-align: center;padding: 5px;">${title}</div>
  <div class="alekpet_modal_close">✕</div>
  </div>
  <div class="alekpet_modal_description" style="padding: 8px;">${text}</div>`;
  boxModalBody.innerHTML = boxModalHtml;

  const alekpet_modal_header = boxModalBody.querySelector(
    ".alekpet_modal_header"
  );
  Object.assign(alekpet_modal_header.style, {
    display: "flex",
    alignItems: "center",
  });

  const close = boxModalBody.querySelector(".alekpet_modal_close");
  Object.assign(close.style, {
    cursor: "pointer",
  });

  let parentElement = document.body;
  if (parent && parent.nodeType === 1) {
    parentElement = parent;
  }

  boxModal.append(boxModalBody);
  parentElement.append(overlay, boxModal);

  const removeEvent = new Event("removeElements");
  const remove = () => {
    animateTransitionProps(boxModal, { opacity: 0 }).then(() =>
      animateTransitionProps(overlay, { opacity: 0 }).then(() => {
        parentElement.removeChild(boxModal);
        parentElement.removeChild(overlay);
      })
    );
  };

  boxModal.addEventListener("removeElements", remove);
  overlay.addEventListener("removeElements", remove);

  animateTransitionProps(overlay)
    .then(() => {
      overlay.addEventListener("click", () => {
        overlay.dispatchEvent(removeEvent);
      });
      animateTransitionProps(boxModal);
    })
    .then(() =>
      boxModal
        .querySelector(".alekpet_modal_close")
        .addEventListener("click", () => boxModal.dispatchEvent(removeEvent))
    );
}

function animateTransitionProps(
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

function showHide({ elements = [], hide = null, displayProp = "block" }) {
  Array.from(elements).forEach((el) => {
    if (hide !== null) {
      el.style.display = !hide ? displayProp : "none";
    } else {
      el.style.display =
        !el.style.display || el.style.display === "none" ? displayProp : "none";
    }
  });
}

function makeElement(tag, attrs = {}) {
  if (!tag) tag = "div";
  const element = document.createElement(tag);
  Object.keys(attrs).forEach((key) => {
    const currValue = attrs[key];
    if (key === "class") {
      if (Array.isArray(currValue)) {
        element.classList.add(...currValue);
      } else if (currValue instanceof String && typeof currValue === "string") {
        element.className = currValue;
      }
    } else if (key === "dataset") {
      try {
        if (Array.isArray(currValue)) {
          currValue.forEach((datasetArr) => {
            const [prop, propval] = Object.entries(datasetArr)[0];
            element.dataset[prop] = propval;
          });
        } else {
          const [prop, propval] = Object.entries(currValue)[0];
          element.dataset[prop] = propval;
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      element[key] = currValue;
    }
  });
  return element;
}

async function getDataJSON(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData;
  } catch (err) {
    return new Error(err);
  }
}

export {
  makeModal,
  animateTransitionProps,
  showHide,
  makeElement,
  getDataJSON,
};
