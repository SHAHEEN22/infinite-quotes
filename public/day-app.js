(async function () {
  var $loading = document.getElementById("loading");
  var $event = document.getElementById("event");
  var $empty = document.getElementById("empty");
  var $error = document.getElementById("error");

  try {
    var res = await fetch("/api/today?date=" + encodeURIComponent(DATE_PARAM));
    $loading.hidden = true;

    if (res.status === 404) {
      $empty.hidden = false;
      document.getElementById("content").setAttribute("aria-busy", "false");
      return;
    }
    if (!res.ok) throw new Error(res.statusText);

    var data = await res.json();

    document.getElementById("label").textContent = data.label;
    document.getElementById("headline").textContent = data.headline;
    document.getElementById("summary").textContent = data.summary;
    var timeEl = document.getElementById("display-date");
    timeEl.textContent = data.display_date;
    if (data.generated_at) {
      timeEl.setAttribute("datetime", data.generated_at.slice(0, 10));
    }
    document.getElementById("year").textContent = data.year;

    // Icon
    var img = document.createElement("img");
    if (data.content_type === "occult_symbol" && data.symbol_key) {
      img.src = "/api/icon?type=symbol&name=" + encodeURIComponent(data.symbol_key);
    } else {
      img.src = "/api/icon?type=category&name=" + encodeURIComponent(data.category);
    }
    img.alt = "";
    img.width = 120;
    img.height = 120;
    img.onload = function () { img.classList.add("loaded"); };
    img.onerror = function () { document.getElementById("icon-container").hidden = true; };
    document.getElementById("icon-container").appendChild(img);

    document.title = data.headline + " \u2014 One Strange Thing";

    // Share button — shares the day link
    document.getElementById("actions").hidden = false;
    var $share = document.getElementById("share-btn");
    var dayUrl = window.location.href;
    $share.addEventListener("click", function () {
      var shareData = {
        title: data.headline + " \u2014 One Strange Thing",
        text: data.headline + ": " + data.summary.split(".")[0] + ".",
        url: dayUrl,
      };
      function showCopied() {
        $share.classList.add("copied");
        $share.querySelector("span").textContent = "Link copied!";
        setTimeout(function () {
          $share.classList.remove("copied");
          $share.querySelector("span").textContent = "Share";
        }, 2000);
      }
      if (navigator.share) {
        navigator.share(shareData).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(dayUrl).then(showCopied).catch(function () {
          var ta = document.createElement("textarea");
          ta.value = dayUrl;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showCopied();
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = dayUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showCopied();
      }
    });

    // Reveal
    $event.hidden = false;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        $event.classList.add("visible");
        document.getElementById("content").setAttribute("aria-busy", "false");
      });
    });
  } catch (e) {
    $loading.hidden = true;
    $error.hidden = false;
    document.getElementById("content").setAttribute("aria-busy", "false");
    console.error("Failed to load content:", e);
  }
})();

// Heart easter egg (with Easter override)
(function () {
  var $heart = document.getElementById("heart");
  if (!$heart || typeof confetti !== "function") return;

  var now = new Date();
  var isEaster = now.getMonth() === 3 && now.getDate() === 5 && now.getFullYear() === 2026;

  if (isEaster) {
    $heart.textContent = "\uD83D\uDC07";
    $heart.style.cursor = "pointer";
  }

  var symbols = isEaster
    ? [
        confetti.shapeFromText({ text: "\uD83D\uDC30", scalar: 2 }),
        confetti.shapeFromText({ text: "\uD83E\uDD5A", scalar: 2 }),
        confetti.shapeFromText({ text: "\uD83C\uDF37", scalar: 2 }),
        confetti.shapeFromText({ text: "\uD83C\uDF38", scalar: 2 }),
        confetti.shapeFromText({ text: "\uD83D\uDC23", scalar: 2 }),
        confetti.shapeFromText({ text: "\u2728", scalar: 2 }),
      ]
    : [
        confetti.shapeFromText({ text: "\u2726", scalar: 2 }),
        confetti.shapeFromText({ text: "\u263D", scalar: 2 }),
        confetti.shapeFromText({ text: "\u263E", scalar: 2 }),
        confetti.shapeFromText({ text: "\u2697", scalar: 2 }),
        confetti.shapeFromText({ text: "\u03C8", scalar: 2 }),
        confetti.shapeFromText({ text: "\u2661", scalar: 2 }),
      ];

  var colors = isEaster
    ? ["#ff69b4", "#87ceeb", "#98fb98", "#dda0dd", "#fffacd", "#ffb347"]
    : ["#8b4513", "#c4a882", "#74604a", "#7a5c10", "#3d2b1f"];

  $heart.addEventListener("click", function () {
    var rect = $heart.getBoundingClientRect();
    var x = (rect.left + rect.width / 2) / window.innerWidth;
    var y = (rect.top + rect.height / 2) / window.innerHeight;
    confetti({
      particleCount: isEaster ? 50 : 30,
      spread: isEaster ? 120 : 80,
      startVelocity: 20, gravity: 0.6,
      scalar: 2, shapes: symbols, origin: { x: x, y: y }, ticks: 120,
      colors: colors,
    });

    if (isEaster && !document.getElementById("easter-msg")) {
      var msg = document.createElement("span");
      msg.id = "easter-msg";
      msg.textContent = " Happy Easter!";
      msg.style.cssText =
        "font-family:'EB Garamond',Georgia,serif;font-size:0.85rem;color:#c4a882;" +
        "opacity:0;transition:opacity 0.4s;";
      $heart.parentNode.insertBefore(msg, $heart.nextSibling);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { msg.style.opacity = "1"; });
      });
      setTimeout(function () {
        msg.style.opacity = "0";
        setTimeout(function () { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 400);
      }, 20000);
    }
  });
})();
