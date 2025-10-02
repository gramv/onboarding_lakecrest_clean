import{j as e}from"./radixUI-MBKqlelr.js";import{a as c}from"./vendor-BQUE8CnD.js";import{d as m,a as _,B as l,g as R}from"./index-BX3Jf5rY.js";import"./card-0UsC1Hfx.js";import{D as Q,a as M,b as $,c as E,d as L,e as z}from"./dialog-BrcI6BMt.js";import{I as T}from"./input-C7n7UaRv.js";import{L as I}from"./label-BGHhm9HA.js";import{C as P}from"./copy-Bygxza59.js";import{R as S}from"./refresh-cw-FCIZnuDU.js";import{D as q}from"./download-DxzIzwbA.js";/**
 * @license lucide-react v0.364.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const O=m("ExternalLink",[["path",{d:"M15 3h6v6",key:"1q9fwt"}],["path",{d:"M10 14 21 3",key:"gplh6r"}],["path",{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6",key:"a6xqqp"}]]);/**
 * @license lucide-react v0.364.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=m("Printer",[["polyline",{points:"6 9 6 2 18 2 18 9",key:"1306q4"}],["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["rect",{width:"12",height:"8",x:"6",y:"14",key:"5ipwut"}]]);/**
 * @license lucide-react v0.364.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=m("QrCode",[["rect",{width:"5",height:"5",x:"3",y:"3",rx:"1",key:"1tu5fj"}],["rect",{width:"5",height:"5",x:"16",y:"3",rx:"1",key:"1v8r4q"}],["rect",{width:"5",height:"5",x:"3",y:"16",rx:"1",key:"1x03jg"}],["path",{d:"M21 16h-3a2 2 0 0 0-2 2v3",key:"177gqh"}],["path",{d:"M21 21v.01",key:"ents32"}],["path",{d:"M12 7v3a2 2 0 0 1-2 2H7",key:"8crl2c"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M12 3h.01",key:"n36tog"}],["path",{d:"M12 16v.01",key:"133mhm"}],["path",{d:"M16 12h1",key:"1slzba"}],["path",{d:"M21 12v.01",key:"1lwtk9"}],["path",{d:"M12 21v-1",key:"1880an"}]]);function X({property:i,onRegenerate:p,showRegenerateButton:w=!0,className:y=""}){const[f,h]=c.useState(!1),[t,v]=c.useState(null),[x,u]=c.useState(!1),{toast:r}=_(),g=async()=>{var s,a,n;u(!0);try{const o=await R.post(`/api/hr/properties/${i.id}/qr-code`,{}),N=((s=o==null?void 0:o.data)==null?void 0:s.data)??(o==null?void 0:o.data);v(N),p&&p(i.id),r({title:"Success",description:"QR code regenerated successfully"})}catch(o){console.error("Error regenerating QR code:",o),r({title:"Error",description:((n=(a=o.response)==null?void 0:a.data)==null?void 0:n.detail)||"Failed to regenerate QR code",variant:"destructive"})}finally{u(!1)}},j=async(s,a)=>{try{await navigator.clipboard.writeText(s),r({title:"Copied!",description:`${a} copied to clipboard`})}catch{r({title:"Error",description:"Failed to copy to clipboard",variant:"destructive"})}},b=()=>{const s=window.open("","_blank");if(s&&(t!=null&&t.printable_qr_url||i.qr_code_url)){const a=(t==null?void 0:t.printable_qr_url)||i.qr_code_url,n=(t==null?void 0:t.property_name)||i.name,o=(t==null?void 0:t.application_url)||`http://localhost:3000/apply/${i.id}`;s.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${n}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                margin: 0;
                padding: 20px;
                background: white;
              }
              .qr-container {
                max-width: 600px;
                margin: 0 auto;
                padding: 40px;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
              }
              .property-title {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 30px;
                color: #1f2937;
              }
              .qr-image {
                max-width: 100%;
                height: auto;
                margin: 20px 0;
              }
              .scan-text {
                font-size: 24px;
                font-weight: 600;
                margin: 30px 0 20px 0;
                color: #374151;
              }
              .url-text {
                font-size: 16px;
                color: #6b7280;
                word-break: break-all;
                margin-top: 20px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .qr-container { border: none; }
              }
            </style>
            <script>
              function schedulePrint() {
                const img = document.getElementById('qrImage');
                if (img && !img.complete) {
                  img.onload = function() { setTimeout(function(){ window.print(); }, 200); };
                } else {
                  setTimeout(function(){ window.print(); }, 200);
                }
              }
              window.addEventListener('load', schedulePrint);
            <\/script>
          </head>
          <body>
            <div class="qr-container">
              <div class="property-title">${n}</div>
              <img id="qrImage" src="${a}" alt="QR Code" class="qr-image" />
              <div class="scan-text">Scan to Apply for Jobs</div>
              <div class="url-text">${o}</div>
            </div>
          </body>
        </html>
      `),s.document.close(),s.focus()}},k=()=>{const s=(t==null?void 0:t.printable_qr_url)||i.qr_code_url,a=document.createElement("a");a.href=s,a.download=`qr-code-${i.name.replace(/\s+/g,"-").toLowerCase()}.png`,document.body.appendChild(a),a.click(),document.body.removeChild(a)},C=()=>{h(!0),t||g()};return e.jsx(e.Fragment,{children:e.jsxs(Q,{open:f,onOpenChange:h,children:[e.jsx(M,{asChild:!0,children:e.jsx(l,{variant:"outline",size:"sm",onClick:C,className:y,title:"View QR Code",children:e.jsx(d,{className:"w-4 h-4"})})}),e.jsxs($,{className:"max-w-2xl",children:[e.jsxs(E,{children:[e.jsxs(L,{className:"flex items-center gap-2",children:[e.jsx(d,{className:"w-5 h-5"}),"QR Code - ",i.name]}),e.jsx(z,{children:"Share this QR code with candidates to apply for jobs at this property."})]}),e.jsxs("div",{className:"space-y-6",children:[e.jsx("div",{className:"text-center",children:e.jsx("div",{className:"bg-white p-6 rounded-lg border-2 border-gray-200 inline-block shadow-sm",children:t!=null&&t.qr_code_url||i.qr_code_url?e.jsx("img",{src:(t==null?void 0:t.qr_code_url)||i.qr_code_url,alt:"QR Code",className:"w-64 h-64 mx-auto"}):e.jsx("div",{className:"w-64 h-64 bg-gray-100 rounded flex items-center justify-center",children:e.jsxs("div",{className:"text-center",children:[e.jsx(d,{className:"w-16 h-16 mx-auto mb-2 text-gray-400"}),e.jsx("p",{className:"text-sm text-gray-500",children:"QR Code"}),e.jsx("p",{className:"text-xs text-gray-400",children:"Scan to apply"})]})})})}),e.jsxs("div",{className:"space-y-2",children:[e.jsx(I,{className:"text-sm font-medium",children:"Application URL"}),e.jsxs("div",{className:"flex items-center space-x-2",children:[e.jsx(T,{value:(t==null?void 0:t.application_url)||`http://localhost:3000/apply/${i.id}`,readOnly:!0,className:"text-sm"}),e.jsx(l,{variant:"outline",size:"sm",onClick:()=>j((t==null?void 0:t.application_url)||`http://localhost:3000/apply/${i.id}`,"Application URL"),children:e.jsx(P,{className:"w-4 h-4"})}),e.jsx(l,{variant:"outline",size:"sm",onClick:()=>window.open((t==null?void 0:t.application_url)||`http://localhost:3000/apply/${i.id}`,"_blank"),children:e.jsx(O,{className:"w-4 h-4"})})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-3",children:[w&&e.jsxs(l,{variant:"outline",onClick:g,disabled:x,className:"flex-1 min-w-0",children:[e.jsx(S,{className:`w-4 h-4 mr-2 ${x?"animate-spin":""}`}),"Regenerate QR Code"]}),e.jsxs(l,{variant:"outline",onClick:b,className:"flex-1 min-w-0",children:[e.jsx(U,{className:"w-4 h-4 mr-2"}),"Print QR Code"]}),e.jsxs(l,{variant:"outline",onClick:k,className:"flex-1 min-w-0",children:[e.jsx(q,{className:"w-4 h-4 mr-2"}),"Download"]})]})]})]})]})})}export{X as Q};
