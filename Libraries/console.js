(()=>{const o=(n,e)=>{for(let t in e){let r=e[t];"object"==typeof r?o(n[t],r):n[t]=r}},n=(n,e={})=>{const t=document.createElement(n);return o(t,e),t},e=console,t=n("div",{style:{fontFamily:"'Courier New',monospace",fontSize:"14px",background:"#eeeeee",position:"absolute",bottom:"5px",left:"5px",display:"block",zIndex:1e12,padding:"10px",borderLeft:"4px solid #dedede",borderRadius:"2px",overflow:"auto",maxWidth:"250px",maxHeight:"300px"}}),r={log:function(...o){t.appendChild(n("p",{style:{marginTop:0,marginBottom:0,color:"#000000"},innerHTML:o.join(" ")}))},warn:function(...o){t.appendChild(n("p",{style:{marginTop:0,marginBottom:0,color:"#ff7a14"},innerHTML:"[!]: "+o.join(" ")}))},info:function(...o){t.appendChild(n("p",{style:{marginTop:0,marginBottom:0,color:"#1d5dff"},innerHTML:"[?]: "+o.join(" ")}))},error:function(...o){t.appendChild(n("p",{style:{marginTop:0,marginBottom:0,color:"#ff1a4c"},innerHTML:"[X]: "+o.join(" ")}))}};window.console=new Proxy({},{get:function(o,n){if(r.hasOwnProperty(n))return r[n];let t=e[n];return"function"==typeof t&&(r[n]=t.bind(e)),r[n]||t},set:function(o,n,t){return e[n]=t,r.hasOwnProperty(n)&&"function"==typeof t&&(r[n]=t.bind(e)),r[n]||t}}),window.addEventListener("error",o=>r.error(o.error)),r.log('<b style="background:#dedede;padding:0px 10px">Custom Console</b>'),document.body.appendChild(t)})();