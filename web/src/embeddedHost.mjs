function frameCapability() {
  if (typeof globalThis.__CODEX_TASKBOARD_FRAME_CAPABILITY__ === "string") {
    return globalThis.__CODEX_TASKBOARD_FRAME_CAPABILITY__;
  }
  try {
    const capability = new URLSearchParams(window.location.hash.slice(1))
      .get("codex-frame-capability");
    return /^[a-f0-9-]{36,80}$/i.test(capability || "") ? capability : "";
  } catch {
    return "";
  }
}

let activeFrameChallenge = "";

export function setEmbeddedFrameChallenge(challenge) {
  activeFrameChallenge = typeof challenge === "string" ? challenge : "";
}

export function postEmbeddedHostMessage(message) {
  window.parent.postMessage({
    ...message,
    capability: frameCapability(),
    challenge: activeFrameChallenge,
  }, "*");
}

export function installEmbeddedExternalLinkHandler() {
  const handleClick = (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('a[target="_blank"]')
      : null;
    if (!link) return;

    let url;
    try {
      url = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (url.protocol !== "https:") return;
    event.preventDefault();
    postEmbeddedHostMessage({
      type: "taskboard:open-external",
      payload: { url: url.href },
    });
  };

  document.addEventListener("click", handleClick, true);
  return () => document.removeEventListener("click", handleClick, true);
}
