const HTTP = {
	ContentTypes:{
    	"application/json":x=>JSON.stringify(x),
        "application/x-www-form-urlencoded":x=>{
        	let Result = [];
            for(let k in x){
            	let v = x[k];
                Result.push(`${k}=${encodeURIComponent(v)}`);
            }
            return "?"+Result.join("&");
        },
    },
	Get:async function(URL,Data={}){
    	return await new Promise(r=>{
        	let x = new XMLHttpRequest();
            x.onreadystatechange = function(){
            	if (x.readyState == x.DONE){
                	r(x.response);
                }
            }
            let NURL = URL+HTTP.ContentTypes["application/x-www-form-urlencoded"](Data);
            x.open("GET",NURL);
            x.send();
        }).then(x=>x)
    },
    Post:async function(URL,Data,Headers={}){
    	return await new Promise(r=>{
        	let x = new XMLHttpRequest();
            x.onreadystatechange = function(){
            	if (x.readyState == x.DONE){
                	r(x.response);
                }
            }
            x.open("POST",URL,true);
            for(let k in Headers){
            	let v = Headers[k];
                x.setRequestHeader(k,v);
            }
            let Callback = HTTP.ContentTypes["application/json"];
            if(Headers["Content-Type"]){
            	let Type = Headers["Content-Type"];
                let NC = HTTP.ContentTypes[Type];
                if(NC)Callback=NC;
            }
            let NewData=Callback(Data);
            x.send(NewData);
        }).then(x=>x);
    },
}
