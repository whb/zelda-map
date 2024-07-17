$(function () {
  var bounds = new L.LatLngBounds(
    new L.LatLng(-49.875, 34.25),
    new L.LatLng(-206, 221)
  );

  let center = new L.LatLng(-150,128);

  var map = L.map("mapContainer", {
    crs: L.CRS.Simple,
    attributionControl: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
  }).setView(center, 4);

  var layer_tile = "assets/maps/{z}_{x}_{y}.png";
  var layer = L.tileLayer(layer_tile, {
    attribution: "&copy; David",
    minZoom: 2,
    maxZoom: 7,
    noWrap: true,
    bounds: bounds,
  }).addTo(map);

  //var overlay_tile = 'http://www.16p.top/Title/{z}_{x}_{y}.png';
  var overlay_tile = "assets/titles/{z}_{x}_{y}.png";
  var overlaylayer = L.tileLayer(overlay_tile, {
    minZoom: 2,
    maxZoom: 6,
    noWrap: true,
    bounds: bounds,
  }).addTo(map);

  var markerStyle = {};
  var visibleMarker = {};
  var css = "";
  var typeChinese = {
    quest: "任务",
    miniboss: "头目",
    treasure: "宝箱",
    shrine: "神庙",
    stable: "马宿",
    tower: "塔",
    town: "城镇",
    "great-fairy-fountain": "大精灵",
    "korok-seed": "种子",
    memory: "记忆",
  };
  var listContainer = $("#switchType ul");
  $("<li>").attr("data-type", "all").text("全部").appendTo(listContainer);
  $("<li>").attr("data-type", "none").text("无").appendTo(listContainer);
  $.each(markerCatalog, function () {
    var name = this.name;
    $("<li>")
      .text(typeChinese[name] || name)
      .appendTo(listContainer)
      .addClass("title");
    $.each(this.children, function () {
      var name = this.name;
      $("<li>")
        .attr("data-type", this.id)
        .text(typeChinese[name] || name)
        .appendTo(listContainer)
        .addClass("icon-" + this.img);
      markerStyle[this.id] = this.img;
      visibleMarker[this.id] = false;
      css +=
        ".icon-" +
        this.img +
        ", .icon-" +
        this.img +
        ":after {background-color:" +
        this.color +
        ";}";
    });
  });
  $("<style>").text(css).insertBefore($("head").find("*")[0]);
  $("#switchType li").click(function () {
    if ($(this).attr("data-type")) toggleVisible($(this).attr("data-type"));
  });

  //===============补充神庙数据=================
  markerData.forEach((markerD) => {
    patchShrineMaker(markerD);
  });

  function patchShrineMaker(m) {
    if (m.markerCategoryId != "1925") return;
    const shrine = shrinesNote.find((s) => s.ctitle === m.name);
    m.trials = shrine ? shrine.ccontent : null;
    m.trigger = shrine ? shrine.trigger : null;
  }
  //============================================

  function toggleVisible(type) {
    if (type === "all" || type === "none") {
      for (var o in visibleMarker) {
        if (visibleMarker.hasOwnProperty(o)) {
          visibleMarker[o] = type === "all" ? true : false;
        }
      }
    } else {
      if (visibleMarker[type]) {
        visibleMarker[type] = false;
      } else {
        visibleMarker[type] = true;
      }
    }
    refreshFilter();
    refreshMarker("filter");
  }

  function refreshFilter() {
    var allVisible = true;
    var allHidden = true;
    for (var o in visibleMarker) {
      if (visibleMarker.hasOwnProperty(o)) {
        if (!visibleMarker[o]) {
          allVisible = false;
        } else {
          allHidden = false;
        }
      }
    }
    $("#switchType li").removeClass("current");
    if (allVisible) {
      $("#switchType li[data-type=all]").addClass("current");
    } else if (allHidden) {
      $("#switchType li[data-type=none]").addClass("current");
    } else {
      for (var p in visibleMarker) {
        if (visibleMarker.hasOwnProperty(p)) {
          if (visibleMarker[p]) {
            $("#switchType li[data-type='" + p + "']").addClass("current");
          }
        }
      }
    }
  }

  function buildKey(m) {
    return (
      m.markerCategoryId + "-" + m.id + "-" + m.name.replace(/[^A-Z]/gi, "-")
    );
  }

  function buildPopupContainer(m, key) {
    let titleName =
      m.markerCategoryId === "1921" ||
      m.markerCategoryId === "1923" ||
      m.markerCategoryId === "1924" ||
      m.markerCategoryId === "1925" ||
      m.markerCategoryId === "1927" ||
      m.markerCategoryId === "1938"
        ? m.name + " (" + m.enName + ")"
        : m.name;

    let popupHtml = '<div class="popupContainer">';
    popupHtml += '<strong class="name">' + titleName + "</strong>";

    if (m.markerCategoryId === "1925") {
      popupHtml += '<div class="trialsContainer">';
      popupHtml += '<span class="trials">' + m.trials + "</span>";
      popupHtml += "</div>";
    }

    if (m.markerCategoryId === "1925" && m.trigger) {
      popupHtml += '<div class="triggerContainer">';
      popupHtml += '<span class="trigger">' + "触发任务：" + "</span>";
      popupHtml += '<span class="trigger">' + m.trigger + "</span>";
      popupHtml += "</div>";
    }

    popupHtml += '<div class="buttonContainer">';
    popupHtml +=
      '<span class="markButton" onclick="markPoint(this)" data-key="' +
      key +
      '">标记</span>';
    popupHtml +=
      '<a class="markButton" target="_blank" href="https://www.google.com/search?q=' +
      encodeURIComponent(m.name) +
      '">Google</a>';
    popupHtml +=
      '<a class="markButton" target="_blank" href="http://www.baidu.com/baidu?word=' +
      encodeURIComponent(m.name) +
      '">百度</a>';
    popupHtml += "</div>";

    popupHtml += "</div>";
    return popupHtml;
  }

  function isFounded(text, keyword) {
    let result = text
      ? text
          .toLowerCase()
          .replace(/^\s+|\s+$/g, "")
          .indexOf(keyword.toLowerCase().replace(/^\s+|\s+$/, "")) !== -1
      : false;
    return result;
  }

  var cacheMarker = [];
  function refreshMarker(from) {
    cacheMarker.forEach((marker) => marker.remove());
    cacheMarker = [];

    markerData.forEach((markerD) => {
      var visible = false;
      if (from === "filter" && visibleMarker[markerD.markerCategoryId])
        visible = true;
      if (from === "search") {
        var keyword = $("#keywords").val();
        if (
          isFounded(markerD.name, keyword) ||
          isFounded(markerD.description, keyword) ||
          isFounded(markerD.trails, keyword) ||
          isFounded(markerD.trigger, keyword)
        )
          visible = true;
      }

      if (visible) {
        var key = buildKey(markerD);
        var popupHtml = buildPopupContainer(markerD, key);
        var className = "mark-" + key;

        if (localStorage.getItem(key)) {
          className += " marked";
        }
        className += " markIcon";
        className += " icon-" + markerStyle[markerD.markerCategoryId];
        var marker = L.marker([markerD.y, markerD.x], {
          title: markerD.name,
          icon: L.divIcon({
            className: className,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
          }),
        })
          .addTo(map)
          .bindPopup(popupHtml);
        cacheMarker.push(marker);
      }
    });
  }

  toggleVisible("1923");
  toggleVisible("1924");
  toggleVisible("1925");
  toggleVisible("1927");
  toggleVisible("1938");

  var lastKeyworld = "";
  setInterval(function () {
    let newKeyword = $("#keywords").val();
    if (newKeyword === lastKeyworld) return;
    
    lastKeyworld = newKeyword;
    if (newKeyword) {
      refreshMarker("search");
    } else {
      refreshMarker("filter");
    }
  }, 500);
  
  $("#clearKeyword").click(function () {
    $("#keywords").val("");
  });
});

function markPoint(element) {
  var that = $(element);
  var key = that.attr("data-key");
  var oldValue = localStorage.getItem(key);
  var newValue = !oldValue;
  localStorage.setItem(key, newValue ? "1" : "");
  $("#mapContainer .leaflet-marker-pane .mark-" + key).toggleClass(
    "marked",
    newValue
  );
}
