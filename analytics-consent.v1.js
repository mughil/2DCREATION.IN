(function(){
  "use strict";

  var MEASUREMENT_ID="G-W3P1LD9WVC";
  var STORAGE_KEY="2dc.analyticsConsent.v1";
  var LEAD_KEY="2dc.quoteSubmitted.v1";
  var choice=null;
  var analyticsLoaded=false;

  try{choice=localStorage.getItem(STORAGE_KEY);}catch(e){choice=null;}
  if(choice!=="granted"&&choice!=="denied"){choice=null;}

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
  window.gtag("consent","default",{
    ad_storage:"denied",
    ad_user_data:"denied",
    ad_personalization:"denied",
    analytics_storage:"denied",
    functionality_storage:"granted",
    security_storage:"granted",
    wait_for_update:500
  });

  function persist(value){
    choice=value;
    try{localStorage.setItem(STORAGE_KEY,value);}catch(e){}
  }

  function clearAnalyticsCookies(){
    var host=location.hostname;
    document.cookie.split(";").forEach(function(item){
      var name=item.split("=")[0].trim();
      if(name.indexOf("_ga")!==0){return;}
      document.cookie=name+"=; Max-Age=0; path=/; SameSite=Lax";
      document.cookie=name+"=; Max-Age=0; path=/; domain=."+host+"; SameSite=Lax";
    });
  }

  function track(name,parameters){
    if(choice!=="granted"){return;}
    window.gtag("event",name,parameters||{});
  }
  window.track2DCreationEvent=track;
  window.mark2DCreationQuoteSubmitted=function(){
    try{sessionStorage.setItem(LEAD_KEY,"1");}catch(e){}
    track("form_submit_attempt",{form_name:"quote_request"});
  };

  function sendLeadIfConfirmed(){
    if(!/\/thank-you\.html$/.test(location.pathname)){return;}
    var submitted=null;
    try{submitted=sessionStorage.getItem(LEAD_KEY);}catch(e){}
    if(submitted!=="1"){return;}
    track("generate_lead",{lead_source:"website_quote_form"});
    try{sessionStorage.removeItem(LEAD_KEY);}catch(e){}
  }

  function loadAnalytics(){
    if(analyticsLoaded||choice!=="granted"){return;}
    analyticsLoaded=true;
    window.gtag("consent","update",{
      analytics_storage:"granted",
      ad_storage:"denied",
      ad_user_data:"denied",
      ad_personalization:"denied"
    });
    var script=document.createElement("script");
    script.async=true;
    script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);
    window.gtag("js",new Date());
    window.gtag("config",MEASUREMENT_ID,{send_page_view:true});
    sendLeadIfConfirmed();
  }

  function setConsent(value){
    persist(value);
    window.gtag("consent","update",{
      analytics_storage:value,
      ad_storage:"denied",
      ad_user_data:"denied",
      ad_personalization:"denied"
    });
    if(value==="granted"){loadAnalytics();}
    else{clearAnalyticsCookies();}
  }

  function ready(fn){
    if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",fn,{once:true});}
    else{fn();}
  }

  function buildConsentUI(){
    var banner=document.createElement("section");
    banner.className="ac-banner";
    banner.setAttribute("role","region");
    banner.setAttribute("aria-label","Analytics consent");
    banner.innerHTML='<div class="ac-copy"><strong>Your analytics choice</strong><p>We use Google Analytics only with your permission to understand visits and improve this website. <a href="./privacy.html">Privacy Policy</a></p></div><div class="ac-actions"><button class="ac-button" type="button" data-ac="reject">Reject</button><button class="ac-button" type="button" data-ac="settings">Settings</button><button class="ac-button ac-button-primary" type="button" data-ac="accept">Accept analytics</button></div>';

    var settingsButton=document.createElement("button");
    settingsButton.className="ac-settings-button";
    settingsButton.type="button";
    settingsButton.textContent="Analytics settings";
    settingsButton.setAttribute("aria-haspopup","dialog");

    var dialog=document.createElement("dialog");
    dialog.className="ac-dialog";
    dialog.setAttribute("aria-labelledby","ac-title");
    dialog.innerHTML='<div class="ac-dialog-inner"><div class="ac-dialog-head"><div><h2 id="ac-title">Analytics settings</h2><p class="ac-dialog-intro">Choose whether 2D Creation may use Google Analytics to measure website visits and interactions. Advertising storage remains disabled.</p></div><button class="ac-dialog-close" type="button" aria-label="Close analytics settings">&times;</button></div><label class="ac-choice"><input type="checkbox" id="ac-analytics"><span><b>Usage analytics</b><span>Allow page views, enquiry completion and contact-link interactions to be measured.</span></span></label><div class="ac-dialog-actions"><button class="ac-button" type="button" data-ac-dialog="reject">Reject analytics</button><button class="ac-button ac-button-primary" type="button" data-ac-dialog="save">Save choice</button></div><p class="ac-status" role="status" aria-live="polite"></p></div>';

    document.body.appendChild(banner);
    document.body.appendChild(settingsButton);
    document.body.appendChild(dialog);

    var checkbox=dialog.querySelector("#ac-analytics");
    var status=dialog.querySelector(".ac-status");

    function refresh(){
      banner.hidden=choice!==null;
      settingsButton.hidden=choice===null;
      checkbox.checked=choice==="granted";
    }
    function openSettings(){
      checkbox.checked=choice==="granted";
      status.textContent="";
      if(typeof dialog.showModal==="function"){dialog.showModal();}
      else{dialog.setAttribute("open","");}
    }
    function closeSettings(){
      if(typeof dialog.close==="function"&&dialog.open){dialog.close();}
      else{dialog.removeAttribute("open");}
    }

    banner.querySelector('[data-ac="accept"]').addEventListener("click",function(){setConsent("granted");refresh();});
    banner.querySelector('[data-ac="reject"]').addEventListener("click",function(){setConsent("denied");refresh();});
    banner.querySelector('[data-ac="settings"]').addEventListener("click",openSettings);
    settingsButton.addEventListener("click",openSettings);
    dialog.querySelector(".ac-dialog-close").addEventListener("click",closeSettings);
    dialog.querySelector('[data-ac-dialog="reject"]').addEventListener("click",function(){setConsent("denied");refresh();closeSettings();});
    dialog.querySelector('[data-ac-dialog="save"]').addEventListener("click",function(){setConsent(checkbox.checked?"granted":"denied");status.textContent="Your analytics choice has been saved.";refresh();window.setTimeout(closeSettings,450);});
    dialog.addEventListener("click",function(event){if(event.target===dialog){closeSettings();}});
    refresh();
  }

  function attachEventTracking(){
    document.querySelectorAll('a[href^="mailto:"]').forEach(function(link){
      link.addEventListener("click",function(){track("contact_click",{contact_method:"email"});});
    });
    document.querySelectorAll('a[href^="tel:"]').forEach(function(link){
      link.addEventListener("click",function(){track("contact_click",{contact_method:"phone"});});
    });
    document.querySelectorAll('a[href*="wa.me/"]').forEach(function(link){
      link.addEventListener("click",function(){track("contact_click",{contact_method:"whatsapp"});});
    });
    document.querySelectorAll('form[action*="formsubmit.co"]').forEach(function(form){
      form.addEventListener("submit",function(event){
        if(event.defaultPrevented){return;}
        window.mark2DCreationQuoteSubmitted();
      });
    });
  }

  ready(function(){buildConsentUI();attachEventTracking();});
  if(choice==="granted"){loadAnalytics();}
})();
