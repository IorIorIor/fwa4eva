<canvas id="gl" aria-label="FWA FOREVER: every FWA winner as a star in one galaxy"></canvas>
<div id="labels"></div>

<div class="hud" id="brand">
  <div class="seg" role="group" aria-label="View">
    <button id="vFly" aria-pressed="true" aria-label="Fly" title="Fly"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3"/><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3"/><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/></svg><span>Fly</span></button>
    <button id="vMap" aria-pressed="false" aria-label="Map" title="Map (M)"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/></svg><span>Map</span></button>
  </div>
  <button class="ibtn" id="sbtn" aria-pressed="true" aria-label="Sound" title="Sound"></button>
</div>

<svg class="hud" id="cross" viewBox="-90 -90 180 180" aria-hidden="true" hidden><g id="hdg"></g><circle class="ring" id="aimRing" r="10.5"></circle><circle id="boostArc" r="22" pathLength="138.2" transform="rotate(-90)"></circle><circle class="dot" r="1.4"></circle><g id="cmp"></g></svg>
<div class="hud" id="arrive" aria-live="polite"><div class="eyebrow" id="arE"></div><h2 id="arT"></h2><p id="arS"></p></div>
<div class="hud" id="nav" role="search">
  <div id="navRes" role="listbox" hidden></div>
  <div class="nrow"><button type="button" id="navPrev" aria-label="Previous winner" title="Previous (←)">‹</button><input type="search" id="navQ" placeholder="Search FWAs" aria-label="Search winners" autocomplete="off" spellcheck="false"><button type="button" id="navNext" aria-label="Next winner" title="Next (→)">›</button><button type="button" id="navFilter" aria-expanded="false" aria-controls="panel">Filter</button></div>
  <div id="navTl"><button type="button" id="navDay"></button><canvas aria-label="Timeline: scroll or drag to a day"></canvas></div>
</div>
<div class="hud" id="tourPill" hidden></div>
<div class="hud" id="speed" aria-hidden="true"><b></b><i><i></i></i></div>
<div id="lockMark" hidden><i></i><i></i><i></i><i></i><b></b></div>
<div class="hud" id="gauge"></div>
<div class="hud" id="legend" hidden></div>
<a class="hud" id="logo" href="https://thefwa.com" target="_blank" rel="noopener" aria-label="FWA"><svg viewBox="0 0 509 149" aria-hidden="true"><path d="M426.737 21.1282C432.405 21.1245 438.545 19.9998 442.607 24.4915C446.715 29.0343 445.679 36.9612 445.667 42.6986L445.659 63.6654L465.267 63.6829C471.199 63.6579 479.267 62.5828 483.909 66.8099C489.919 72.2836 487.214 83.5291 479.069 85.0941C475.367 85.804 470.395 85.4985 466.545 85.4935L445.697 85.4818C445.465 95.9067 446.09 106.977 445.345 117.374C445.014 122.009 440.399 126.337 435.685 126.464C430.877 126.592 425.837 126.479 420.909 126.474L360.585 126.487C356.587 126.487 352.622 126.476 348.622 126.409C344.752 126.344 341.655 124.378 339.832 120.868C339.162 119.571 338.742 118.162 338.59 116.709C337.995 110.629 338.342 101.434 338.462 96.0189C339.059 69.449 333.245 62.2165 363.137 63.639C369.348 63.9344 423.047 63.6751 423.614 63.3929L423.685 62.4642L423.675 42.846C405.617 43.0553 387.085 42.8491 368.982 42.8529L349.755 42.8568C346.203 42.8588 341.455 42.9883 338 42.6868L306.244 101.644C302.429 108.726 298.469 116.436 294.627 123.536C293.882 124.541 292.215 125.534 291.152 126.049C286.512 128.297 280.659 126.856 277.949 122.416C275.947 119.139 274.342 115.806 272.619 112.404L252.79 73.4193C250.03 68.0713 246.63 61.7066 244.197 56.2708C242.046 61.1643 237.32 69.3562 234.682 74.2738C228.439 85.9862 222.114 97.6538 215.706 109.274C213.33 113.574 211.369 118.116 209.081 122.431C207.954 124.003 206.008 125.591 204.267 126.314C193.426 130.803 189.424 119.016 185.868 111.989L176.262 93.0238L160.148 61.4915C157.112 55.5506 153.67 49.169 150.901 43.1556C129.315 42.8511 106.833 43.0927 85.1914 43.1722L85.1797 63.9036C101.951 64.0936 118.772 63.7875 135.549 63.9114C139.475 63.9404 142.344 63.9384 145.469 66.8226C147.584 68.761 148.822 71.4737 148.9 74.3411C148.956 77.4361 147.74 80.4186 145.536 82.5911C141.674 86.3736 136.283 85.6087 131.312 85.6937C128.093 85.7487 124.836 85.6942 121.613 85.6917L85.1572 85.6536C85.2465 91.7236 85.1803 97.8289 85.1963 103.911C85.0355 108.821 85.615 113.702 84.6357 118.562C82.3562 129.876 65.9505 130.399 63.6553 118.916C62.8208 114.741 63.1664 109.422 63.1709 105.062L63.1719 85.8665C60.7536 85.5465 56.3834 85.6716 53.7851 85.6741L38.1777 85.7044C35.2877 85.7094 32.254 85.8319 29.4062 85.3294C24.9372 84.5393 21.1516 79.7816 21.0039 75.2943C20.9252 72.3069 22.0455 69.4117 24.1142 67.2552C25.4891 65.8133 27.2468 64.7926 29.1806 64.3128C31.7701 63.6876 39.3069 63.8964 42.417 63.9027L62.6953 63.8997L62.6924 41.9691C62.6879 33.2268 61.162 22.8023 72.9043 21.2396C75.3472 20.9833 81.2446 21.1352 83.9365 21.138L105.071 21.1556L138.192 21.1448C144.055 21.1431 149.967 21.0962 155.826 21.2025C157.549 21.2672 159.424 21.4711 161.032 22.098C162.885 22.8202 165.255 24.654 166.205 26.4046C167.481 28.7569 168.714 31.2014 169.938 33.5814L192.765 78.3743C194.98 82.7292 197.987 88.1661 199.891 92.4935C201.303 89.401 203.683 85.2583 205.329 82.181L229.524 36.9671C231.275 33.6846 233.086 30.2891 234.766 26.8948C237.089 22.2003 241.66 20.5481 246.715 21.8529C248.932 22.4252 252.122 24.7491 253.437 26.7845C256.997 32.2937 259.492 38.7046 262.607 44.4886C270.76 60.195 278.254 76.6665 286.569 92.2464C292.487 80.5014 299.757 67.7331 306.055 56.0511L315.172 39.1029C316.459 36.7099 318.044 33.9434 319.244 31.5482C323.342 23.3672 326.527 21.1947 335.802 21.1429L406.237 21.1497L426.737 21.1282ZM359.932 104.664L423.699 104.684C423.702 98.3664 423.77 91.9211 423.692 85.6136L380.979 85.6116C375.052 85.6116 365.647 85.9218 359.952 85.5843L359.932 104.664Z" fill="none" stroke="#000" stroke-width="42" stroke-linejoin="round"/><path d="M426.737 21.1282C432.405 21.1245 438.545 19.9998 442.607 24.4915C446.715 29.0343 445.679 36.9612 445.667 42.6986L445.659 63.6654L465.267 63.6829C471.199 63.6579 479.267 62.5828 483.909 66.8099C489.919 72.2836 487.214 83.5291 479.069 85.0941C475.367 85.804 470.395 85.4985 466.545 85.4935L445.697 85.4818C445.465 95.9067 446.09 106.977 445.345 117.374C445.014 122.009 440.399 126.337 435.685 126.464C430.877 126.592 425.837 126.479 420.909 126.474L360.585 126.487C356.587 126.487 352.622 126.476 348.622 126.409C344.752 126.344 341.655 124.378 339.832 120.868C339.162 119.571 338.742 118.162 338.59 116.709C337.995 110.629 338.342 101.434 338.462 96.0189C339.059 69.449 333.245 62.2165 363.137 63.639C369.348 63.9344 423.047 63.6751 423.614 63.3929L423.685 62.4642L423.675 42.846C405.617 43.0553 387.085 42.8491 368.982 42.8529L349.755 42.8568C346.203 42.8588 341.455 42.9883 338 42.6868L306.244 101.644C302.429 108.726 298.469 116.436 294.627 123.536C293.882 124.541 292.215 125.534 291.152 126.049C286.512 128.297 280.659 126.856 277.949 122.416C275.947 119.139 274.342 115.806 272.619 112.404L252.79 73.4193C250.03 68.0713 246.63 61.7066 244.197 56.2708C242.046 61.1643 237.32 69.3562 234.682 74.2738C228.439 85.9862 222.114 97.6538 215.706 109.274C213.33 113.574 211.369 118.116 209.081 122.431C207.954 124.003 206.008 125.591 204.267 126.314C193.426 130.803 189.424 119.016 185.868 111.989L176.262 93.0238L160.148 61.4915C157.112 55.5506 153.67 49.169 150.901 43.1556C129.315 42.8511 106.833 43.0927 85.1914 43.1722L85.1797 63.9036C101.951 64.0936 118.772 63.7875 135.549 63.9114C139.475 63.9404 142.344 63.9384 145.469 66.8226C147.584 68.761 148.822 71.4737 148.9 74.3411C148.956 77.4361 147.74 80.4186 145.536 82.5911C141.674 86.3736 136.283 85.6087 131.312 85.6937C128.093 85.7487 124.836 85.6942 121.613 85.6917L85.1572 85.6536C85.2465 91.7236 85.1803 97.8289 85.1963 103.911C85.0355 108.821 85.615 113.702 84.6357 118.562C82.3562 129.876 65.9505 130.399 63.6553 118.916C62.8208 114.741 63.1664 109.422 63.1709 105.062L63.1719 85.8665C60.7536 85.5465 56.3834 85.6716 53.7851 85.6741L38.1777 85.7044C35.2877 85.7094 32.254 85.8319 29.4062 85.3294C24.9372 84.5393 21.1516 79.7816 21.0039 75.2943C20.9252 72.3069 22.0455 69.4117 24.1142 67.2552C25.4891 65.8133 27.2468 64.7926 29.1806 64.3128C31.7701 63.6876 39.3069 63.8964 42.417 63.9027L62.6953 63.8997L62.6924 41.9691C62.6879 33.2268 61.162 22.8023 72.9043 21.2396C75.3472 20.9833 81.2446 21.1352 83.9365 21.138L105.071 21.1556L138.192 21.1448C144.055 21.1431 149.967 21.0962 155.826 21.2025C157.549 21.2672 159.424 21.4711 161.032 22.098C162.885 22.8202 165.255 24.654 166.205 26.4046C167.481 28.7569 168.714 31.2014 169.938 33.5814L192.765 78.3743C194.98 82.7292 197.987 88.1661 199.891 92.4935C201.303 89.401 203.683 85.2583 205.329 82.181L229.524 36.9671C231.275 33.6846 233.086 30.2891 234.766 26.8948C237.089 22.2003 241.66 20.5481 246.715 21.8529C248.932 22.4252 252.122 24.7491 253.437 26.7845C256.997 32.2937 259.492 38.7046 262.607 44.4886C270.76 60.195 278.254 76.6665 286.569 92.2464C292.487 80.5014 299.757 67.7331 306.055 56.0511L315.172 39.1029C316.459 36.7099 318.044 33.9434 319.244 31.5482C323.342 23.3672 326.527 21.1947 335.802 21.1429L406.237 21.1497L426.737 21.1282ZM359.932 104.664L423.699 104.684C423.702 98.3664 423.77 91.9211 423.692 85.6136L380.979 85.6116C375.052 85.6116 365.647 85.9218 359.952 85.5843L359.932 104.664Z" fill="#FEFEFE" fill-rule="evenodd"/></svg></a>
<div class="hud" id="topbar"><button class="btn" hidden id="lbtn" aria-expanded="false" aria-controls="lookPanel">Look</button><button class="btn" hidden id="fbtn" aria-expanded="false" aria-controls="panel">Filters</button></div>
<aside class="hud sheet" id="lookPanel" aria-label="Look" inert>
  <header><div class="lh">Look</div><div class="presets" id="presets"></div></header>
  <div class="lsave"><input type="search" id="lookFind" placeholder="Search settings" aria-label="Search settings" autocomplete="off" spellcheck="false"><button class="btn" id="lookCopy">Copy settings</button><span id="lookMsg" role="status"></span><textarea id="lookOut" readonly hidden aria-label="Current settings"></textarea></div>
  <div class="scroll" id="lookBody"></div>
</aside>
<button class="hud" id="thrust" aria-label="Thrust (slide up to boost)"><i></i><b>Boost</b><span>Thrust</span></button><button class="hud" id="brake">Brake</button>

<aside class="hud sheet" id="panel" aria-label="Filters" inert>
  <header><div id="count">0<small>sites</small></div><button class="btn" id="reset">Reset</button></header>
  <div class="scroll">
    <div class="grp">
      <div class="lbl">Color by</div>
      <select id="colorBy"><option value="type">Star type</option><option value="category">Category</option><option value="award">Award</option><option value="year">Year</option><option value="tech">Lead technology</option></select>
    </div>
    <div class="grp">
      <div class="lbl"><span>Years <span id="yrTxt"></span></span><button id="yrAll">All</button></div>
      <div id="hist" aria-label="Winners per year, tap to isolate"></div>
      <div class="yrs"><span>2000</span><span>2013</span><span>2026</span></div>
      <div class="row2"><input type="range" id="y0" min="2000" max="2026" value="2000" aria-label="From year"><input type="range" id="y1" min="2000" max="2026" value="2026" aria-label="To year"></div>
    </div>
    <div class="grp"><div class="lbl">Search</div><input type="search" id="q" placeholder="Title or agency"></div>
    <div class="grp"><div class="lbl">Award</div><div class="chips" id="cAward"></div></div>
    <div class="grp keep"><div class="lbl">Category</div><div class="chips" id="cCat"></div></div>
    <div class="grp"><div class="lbl">Technology</div><div class="chips" id="cTech"></div></div>
    <div class="grp keep"><div class="lbl"><span>Agencies</span><span>each one a constellation</span></div><select id="agency" aria-label="Add an agency constellation"></select><div class="chips" id="cAg"></div></div>
    <div class="grp"><div class="lbl">Country</div><select id="country"></select></div>
    <div class="grp"><div class="lbl"><span>Min jury score</span><span id="scTxt">7.0</span></div><input type="range" id="score" min="7" max="9.8" step="0.1" value="7"></div>
    <div class="grp">
      <div class="lbl">Your archive</div>
      <div class="row2"><label class="btn file">Load data<input type="file" id="fData" accept=".json,.csv,application/json,text/csv" hidden></label><label class="btn file">Screenshots<input type="file" id="fShots" accept="image/*" multiple hidden></label></div>
      <div id="dStat"></div>
      <button class="btn" id="dClear" hidden>Back to sample data</button>
    </div>
    <p class="note"><span id="srcNote"></span> Columns: date, title, agency, country, category, tech, award, score, url, screenshot. Screenshots match by file name (date, title or the screenshot column). Multiplayer: <span id="net"></span>.</p>
  </div>
</aside>

<section class="hud" id="card" hidden aria-live="polite">
  <canvas id="cImg" width="640" height="400" aria-hidden="true"></canvas>
  <div class="cHead"><div class="cDay" id="cDay"></div><div class="cMeta"><span id="cMon"></span><span id="cAw"></span></div></div>
  <div class="cBody"><div class="cKind" id="cKind"></div><h2 id="cT"></h2></div>
  <dl id="cDl"></dl>
</section>
<div id="tip" hidden></div>
<div class="hud" id="coach" hidden aria-live="polite"></div>
<div id="youTime" hidden></div>
