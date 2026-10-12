/* Arbor Law — Succession Check. Runs entirely in the visitor's browser.
 * Quiz answers are autosaved to this device's localStorage only.
 * Only the lead form (name/phone/email/parish + outcome label) is ever
 * sent to the server. Quiz answers never leave this device. */
(function () {
  "use strict";

  var STORE_KEY = "arbor.sc.quiz.v1";

  var QUESTIONS = [
    {
      id: "realEstate", title: "Did they own any real estate in Louisiana?",
      sub: "A house, land, a camp \u2014 anything with a deed.",
      answers: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No" },
        { v: "unsure", t: "Not sure" }
      ]
    },
    {
      id: "will", title: "Was there a valid will?",
      sub: "A signed will \u2014 not just a verbal promise.",
      answers: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No" },
        { v: "unsure", t: "Not sure" }
      ]
    },
    {
      id: "successionOpened", title: "Has a succession already been opened in court?",
      sub: "If a lawyer or a court is already handling it, say yes.",
      answers: [
        { v: "yes", t: "Yes" },
        { v: "no", t: "No" },
        { v: "unsure", t: "Not sure" }
      ]
    },
    {
      id: "debts", title: "Did they have debts?",
      sub: "Credit cards, a mortgage, medical bills \u2014 anything owed.",
      answers: [
        { v: "significant", t: "Yes, significant" },
        { v: "little", t: "A little" },
        { v: "none", t: "None that I know of" },
        { v: "unsure", t: "Not sure" }
      ]
    },
    {
      id: "heirs", title: "Who are the closest living relatives?",
      sub: null,
      answers: [
        { v: "spousekids", t: "A spouse and/or children" },
        { v: "extended", t: "No spouse or children", s: "Parents, siblings, or other relatives" },
        { v: "unsure", t: "Not sure" }
      ]
    },
    {
      id: "agreement", title: "Last one \u2014 is everyone in agreement about what should happen?",
      sub: null,
      answers: [
        { v: "yes", t: "Yes, we're all on the same page" },
        { v: "no", t: "No, there's disagreement" },
        { v: "unsure", t: "Not sure" }
      ]
    }
  ];

  var PARISHES = [
    'Acadia','Allen','Ascension','Assumption','Avoyelles','Beauregard','Bienville',
    'Bossier','Caddo','Calcasieu','Caldwell','Cameron','Catahoula','Claiborne',
    'Concordia','De Soto','East Baton Rouge','East Carroll','East Feliciana',
    'Evangeline','Franklin','Grant','Iberia','Iberville','Jackson','Jefferson',
    'Jefferson Davis','Lafayette','Lafourche','LaSalle','Lincoln','Livingston',
    'Madison','Morehouse','Natchitoches','Orleans','Ouachita','Plaquemines',
    'Pointe Coupee','Rapides','Red River','Richland','Sabine','St. Bernard',
    'St. Charles','St. Helena','St. James','St. John the Baptist','St. Landry',
    'St. Martin','St. Mary','St. Tammany','Tangipahoa','Tensas','Terrebonne',
    'Union','Vermilion','Vernon','Washington','Webster','West Baton Rouge',
    'West Carroll','West Feliciana','Winn'
  ];

  /* ---- persistence (device only) ---- */
  function loadSaved() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return null;
      return s;
    } catch (e) { return null; }
  }
  function save(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* private mode */ }
  }
  function clearSaved() {
    try { localStorage.removeItem(STORE_KEY); } catch (e) { /* private mode */ }
  }

  var state = { step: 0, answers: {} };

  /* ---- scoring ---- */
  function score(a) {
    var s = 0;
    s += { yes: 4, unsure: 1, no: 0 }[a.realEstate] || 0;
    s += { no: 1, unsure: 1, yes: 0 }[a.will] || 0;
    s += { no: 2, unsure: 1, yes: 0 }[a.successionOpened] || 0;
    s += { significant: 2, little: 1, unsure: 1, none: 0 }[a.debts] || 0;
    s += { extended: 2, unsure: 1, spousekids: 0 }[a.heirs] || 0;
    s += { no: 2, unsure: 1, yes: 0 }[a.agreement] || 0;
    return s;
  }

  function outcome(a) {
    if (a.successionOpened === "yes") return "open";
    var s = score(a);
    if (s >= 7) return "likely";
    if (s >= 4) return "might";
    return "unlikely";
  }

  function whyBullets(a, oc) {
    var b = [];
    if (oc === "open") {
      b.push("<strong>One may already be handling everything.</strong> If a succession is open in court, that case controls the whole process \u2014 you don't start a second one.");
      b.push("Not sure of its status? The parish clerk of court can look up the case for you.");
      return b;
    }
    if (a.realEstate === "yes") b.push("<strong>They owned Louisiana real estate.</strong> In Louisiana, a house, land, or camp can't be sold or transferred until a succession puts the heirs in legal possession. Handshake deals don't count.");
    if (a.realEstate === "unsure") b.push("You're <strong>not sure about real estate</strong> \u2014 and that's the single biggest factor. One deed changes everything.");
    if (a.debts === "significant") b.push("<strong>Significant debts</strong> mean creditors have to be notified and paid through the succession process \u2014 you can't just divide things up.");
    if (a.debts === "little") b.push("Even <strong>small debts</strong> can complicate things if a creditor comes forward later.");
    if (a.debts === "unsure") b.push("You're <strong>not sure about debts</strong> \u2014 unknown creditors are exactly what the succession process is designed to handle.");
    if (a.agreement === "no") b.push("<strong>Family disagreement</strong> is the number-one reason simple estates end up before a judge. Doing it informally risks lawsuits later.");
    if (a.agreement === "unsure") b.push("You're <strong>not sure everyone's in agreement</strong> \u2014 worth finding out before anything is moved or sold.");
    if (a.will === "no") b.push("<strong>No will</strong> means Louisiana's default inheritance rules decide who gets what \u2014 the court makes it official through a succession.");
    if (a.will === "yes") b.push("Even <strong>with a will</strong>, Louisiana still requires a succession to make it official. A will directs the process \u2014 it doesn't skip court.");
    if (a.will === "unsure") b.push("You're <strong>not sure about a will</strong> \u2014 check safe deposit boxes, filing cabinets, and with any lawyer they used.");
    if (a.heirs === "extended") b.push("<strong>No spouse or children</strong> means the line of inheritance gets complicated fast \u2014 parents, siblings, then further out. Courts get involved here.");
    if (a.heirs === "unsure") b.push("You're <strong>not sure who the closest relatives are</strong> \u2014 that has to be established before anything can be transferred.");
    if (a.successionOpened === "unsure") b.push("If you're <strong>not sure whether one's been opened</strong>, the parish clerk of court can check in minutes.");
    if (oc === "unlikely") {
      b.push("Bank accounts and investments <strong>with named beneficiaries</strong> transfer directly \u2014 no court needed.");
      b.push("If you later find a deed, a will, or debts you didn't know about, retake the quiz \u2014 it takes a minute.");
    }
    return b;
  }

  var COPY = {
    likely: {
      kicker: "Your result",
      title: "You likely need a succession.",
      lede: "Based on your answers, a Louisiana court will probably need to be involved before property, money, or belongings can legally change hands."
    },
    might: {
      kicker: "Your result",
      title: "You might need a succession.",
      lede: "Your answers don't point to a clear yes or no \u2014 and that's exactly when a short conversation with a Louisiana succession office saves you from guessing wrong."
    },
    unlikely: {
      kicker: "Your result",
      title: "You probably don't need a succession.",
      lede: "With no Louisiana real estate, no significant debts, and everyone in agreement, there's likely nothing that requires a court to transfer."
    },
    open: {
      kicker: "Your result",
      title: "It sounds like one's already open.",
      lede: "If a succession has already been opened in court, you don't need to start a new one \u2014 the existing case handles it."
    }
  };

  var FEES = [
    { name: "Affidavit", price: "$1,250", desc: "Small succession by affidavit, when the estate qualifies." },
    { name: "Succession", price: "$2,500", desc: "Full court succession. $3,250 when both parents' estates are handled together." },
    { name: "Title Check", price: "$595", desc: "A careful look at the chain of title before you act." }
  ];

  /* ---- rendering ---- */
  var shell = document.getElementById("quiz");
  var bar = document.getElementById("bar");
  var count = document.getElementById("qcount");

  function scrollTop() { window.scrollTo(0, 0); }

  function renderIntro() {
    bar.style.width = "0%";
    count.textContent = "The Succession Check";
    var saved = loadSaved();
    var canResume = saved && saved.step > 0 && saved.step < QUESTIONS.length;
    shell.innerHTML =
      '<h2 class="q-title">Six questions. About two minutes.</h2>' +
      '<p class="q-sub">Plain English, no legal jargon. Your answers stay on this device \u2014 nothing is sent anywhere.</p>' +
      '<div class="notice-box">' +
        '<span class="label">Please note</span>' +
        '<p>General information, not legal advice. This checker is not a law firm, and using it does not create an attorney-client relationship.</p>' +
      "</div>" +
      '<p style="text-align:center;margin-top:8px;"><button class="btn" id="qstart">Start the check</button></p>' +
      (canResume ? '<p style="text-align:center;margin-top:20px;"><button class="quiz-back" id="qresume" style="margin-top:0;">Pick up where you left off</button></p>' : "");
    document.getElementById("qstart").addEventListener("click", function () {
      clearSaved();
      state = { step: 0, answers: {} };
      renderQuestion();
    });
    var resume = document.getElementById("qresume");
    if (resume) resume.addEventListener("click", function () {
      state = { step: saved.step || 0, answers: saved.answers || {} };
      renderQuestion();
    });
    scrollTop();
  }

  function renderQuestion() {
    var q = QUESTIONS[state.step];
    var N = QUESTIONS.length;
    bar.style.width = (state.step / N * 100) + "%";
    count.textContent = "Step " + (state.step + 1) + " of " + N;
    shell.innerHTML =
      '<div class="q-title">' + q.title + "</div>" +
      (q.sub ? '<p class="q-sub" style="margin-top:-4px;">' + q.sub + "</p>" : "") +
      '<div class="answers">' + q.answers.map(function (a) {
        return '<button class="answer" data-v="' + a.v + '">' + a.t +
          (a.s ? "<small>" + a.s + "</small>" : "") + "</button>";
      }).join("") + "</div>" +
      (state.step > 0 ? '<button class="quiz-back" id="qback">\u2190 Back</button>' : "") +
      '<p class="q-privacy">Your answers stay on this device \u2014 nothing is sent anywhere. Saved automatically.</p>';
    shell.querySelectorAll(".answer").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.answers[q.id] = btn.getAttribute("data-v");
        state.step++;
        save(state); /* autosave after every answer */
        if (state.step < QUESTIONS.length) renderQuestion();
        else renderResults();
      });
    });
    var back = document.getElementById("qback");
    if (back) back.addEventListener("click", function () {
      state.step--;
      save(state);
      renderQuestion();
    });
    scrollTop();
  }

  function feeCards() {
    return '<div class="fees">' + FEES.map(function (f) {
      return '<div class="card fee"><h3>' + f.name + '</h3><div class="price">' + f.price + "</div><p>" + f.desc + '</p><span class="pending">Pending attorney approval</span></div>';
    }).join("") + "</div>" +
      '<p class="small muted" style="text-align:center;margin-top:20px;">Fees are pending attorney sign-off. Once approved, advertised fees are honored for 90 days.</p>';
  }

  function renderResults() {
    if (window.trackEvent) window.trackEvent('quiz_complete');
    var a = state.answers;
    var oc = outcome(a);
    var c = COPY[oc];
    save({ step: QUESTIONS.length, answers: a }); /* keep answers for export */
    bar.style.width = "100%";
    count.textContent = "Your result";
    var bullets = whyBullets(a, oc);
    var parishOptions = PARISHES.map(function (p) {
      return '<option value="' + p + '">' + p + " Parish</option>";
    }).join("");
    shell.innerHTML =
      '<div class="verdict"><div class="kicker">' + c.kicker + "</div>" +
      "<h2>" + c.title + "</h2><p>" + c.lede + "</p></div>" +
      '<div class="why-box"><h3>Why we say that</h3><ul>' +
      bullets.map(function (x) { return "<li>" + x + "</li>"; }).join("") +
      "</ul></div>" +
      '<div style="margin-top:56px;"><div class="kicker" style="text-align:center;">Flat fees</div>' +
      '<h3 style="text-align:center;margin-bottom:8px;">What it would cost</h3>' +
      '<p class="q-sub">The same price for everyone, published here.</p>' +
      feeCards() + "</div>" +
      '<div class="capture">' +
      "<h3>Want a real person to reach out?</h3>" +
      "<p>Tell us where to reach you and a real person from the office of Thomas G. Donelon in Metairie will contact you \u2014 usually within one business day.</p>" +
      '<form id="leadform">' +
      '<label for="lname">Full name</label><input id="lname" type="text" placeholder="Your name" autocomplete="name" required>' +
      '<label for="lphone">Phone</label><input id="lphone" type="tel" placeholder="(504) 555-0123" autocomplete="tel" required>' +
      '<label for="lemail">Email</label><input id="lemail" type="email" placeholder="you@example.com" autocomplete="email" required>' +
      '<label for="lparish">Parish</label><select id="lparish" required><option value="">Choose your parish\u2026</option>' + parishOptions + "</select>" +
      '<button class="btn" type="submit">Have a person contact me</button>' +
      "</form>" +
      '<p class="fine">By submitting, you agree to be contacted about succession services. We never sell your information, and we take no referral fees. General information only \u2014 not legal advice.</p>' +
      "</div>" +
      '<div class="notice-box">' +
        '<span class="label">Disclosure</span>' +
        "<p>General information only \u2014 not legal advice. Arbor Law is not yet the firm's legal name; that name is pending. Software powered by Arbor. Arbor Technologies is a software company, not a law firm.</p>" +
      "</div>" +
      '<p style="text-align:center;margin-top:24px;"><button class="btn btn-ghost" id="retake">Retake the quiz</button></p>';
    document.getElementById("retake").addEventListener("click", function () {
      clearSaved();
      state = { step: 0, answers: {} };
      renderIntro();
    });
    document.getElementById("leadform").addEventListener("submit", function (e) {
      e.preventDefault();
      var box = document.querySelector(".capture");
      var payload = {
        name: document.getElementById("lname").value,
        phone: document.getElementById("lphone").value,
        email: document.getElementById("lemail").value,
        parish: document.getElementById("lparish").value,
        outcome: oc
      };
      fetch("/api/lead", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then(function (res) { return res.json(); }).then(function (data) {
        if (data.ok) { if (window.trackEvent) window.trackEvent('lead_submit'); box.innerHTML = '<div class="done">Got it \u2014 a real person will be in touch shortly.<br>We\u2019re sorry for your loss.</div>'; }
        else box.innerHTML = '<div class="done">' + (data.error || "Something went wrong \u2014 please try again.") + "</div>";
      }).catch(function () {
        box.innerHTML = '<div class="done">Something went wrong \u2014 please try again.</div>';
      });
    });
    scrollTop();
  }

  renderIntro();
})();
