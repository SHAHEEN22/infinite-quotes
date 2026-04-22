(async function () {
  var $loading = document.getElementById("loading");
  var $event = document.getElementById("event");
  var $empty = document.getElementById("empty");
  var $error = document.getElementById("error");

  // Compute today's day link URL
  var now = new Date();
  var dd = String(now.getUTCDate()).padStart(2, "0");
  var mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  var yyyy = String(now.getUTCFullYear());
  var todayDayUrl = "https://onestrangething.net/day/" + dd + mm + yyyy;

  try {
    var res = await fetch("/api/today");
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

    // Icon: use specific symbol SVG for occult_symbol content, otherwise category icon
    var img = document.createElement("img");
    if (data.content_type === "occult_symbol" && data.symbol_key) {
      img.src = "/api/icon?type=symbol&name=" + encodeURIComponent(data.symbol_key);
    } else {
      img.src = "/api/icon?type=category&name=" + encodeURIComponent(data.category);
    }
    img.alt = "";
    img.width = 120;
    img.height = 120;
    img.onload = function () {
      img.classList.add("loaded");
    };
    img.onerror = function () {
      document.getElementById("icon-container").hidden = true;
    };
    document.getElementById("icon-container").appendChild(img);

    // Update browser tab title
    document.title = data.headline + " \u2014 One Strange Thing";

    // Action links (share + RSS)
    document.getElementById("actions").hidden = false;
    var $share = document.getElementById("share-btn");
    $share.addEventListener("click", function () {
      var shareData = {
        title: data.headline + " \u2014 One Strange Thing",
        text: data.headline + ": " + data.summary.split(".")[0] + ".",
        url: todayDayUrl
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
        navigator.clipboard.writeText(shareData.url).then(showCopied).catch(function () {
          // Clipboard API failed (insecure context, permission denied) — use fallback
          var ta = document.createElement("textarea");
          ta.value = shareData.url;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showCopied();
        });
      } else {
        // No clipboard API at all — textarea fallback
        var ta = document.createElement("textarea");
        ta.value = shareData.url;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        showCopied();
      }
    });

    // Reveal content with entrance animation
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

// Triple-click headline — declassified stamp
(function () {
  var $headline = document.getElementById("headline");
  if (!$headline) return;

  var clickCount = 0;
  var clickTimer = null;

  $headline.addEventListener("click", function () {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(function () { clickCount = 0; }, 400);

    if (clickCount >= 3) {
      clickCount = 0;
      clearTimeout(clickTimer);

      // Get category for the subtitle
      var $label = document.getElementById("label");
      var division = $label ? $label.textContent : "UNKNOWN";

      // Create stamp
      var stamp = document.createElement("div");
      stamp.className = "declassified-stamp";
      stamp.innerHTML = "DECLASSIFIED<span class='subtitle'>" + division + " DIVISION</span>";
      document.body.appendChild(stamp);

      // Animate in
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          stamp.classList.add("visible");
        });
      });

      // Fade out and remove
      setTimeout(function () {
        stamp.classList.remove("visible");
        setTimeout(function () {
          document.body.removeChild(stamp);
        }, 300);
      }, 1800);
    }
  });
})();

// Heart easter egg — occult symbol confetti burst (with Easter override)
(function () {
  var $heart = document.getElementById("heart");
  if (!$heart || typeof confetti !== "function") return;

  // Easter egg: swap heart for rabbit on Easter 2026
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
        confetti.shapeFromText({ text: "✦", scalar: 2 }),
        confetti.shapeFromText({ text: "☽", scalar: 2 }),
        confetti.shapeFromText({ text: "☾", scalar: 2 }),
        confetti.shapeFromText({ text: "⚗", scalar: 2 }),
        confetti.shapeFromText({ text: "ψ", scalar: 2 }),
        confetti.shapeFromText({ text: "♡", scalar: 2 }),
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
      startVelocity: 20,
      gravity: 0.6,
      scalar: 2,
      shapes: symbols,
      origin: { x: x, y: y },
      ticks: 120,
      colors: colors,
    });

    // Easter: show "Happy Easter!" inline next to rabbit
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
