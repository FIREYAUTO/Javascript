/*
proxy.js file
  Programmed by FIREYAUTO on 11/30/21 (November 30th, 2021)
  
This JS script allows you to create pseudo-proxy elements
*/

class PseudoProxy {
	constructor(FallbackObject){
    	this.FallbackObject = FallbackObject;
        this.RawProxyObject = {};
        this.Properties = {};
        const PProxy = this;
        this.ProxyObject = new Proxy(this.RawProxyObject,{
        	get:function(self,Name){
            	if(PProxy.Properties.hasOwnProperty(Name)){
                	let Property = PProxy.Properties[Name];
                    if(Property.OnGet){
                    	return Property.OnGet(PProxy);
                    }else{
                    	return Property.Value;
                    }
                }else{
			let Value = PProxy.FallbackObject[Name];
			if(typeof Value=="function")Value=Value.bind(PProxy.FallbackObject);
                	return Value;
                }
            },
            set:function(self,Name,Value){
            	if(PProxy.Properties.hasOwnProperty(Name)){
                	let Property = PProxy.Properties[Name];
                    if(Property.OnSet){
                    	Property.OnSet(PProxy,Value);
                    }else{
                    	Property.Value=Value;
                    }
                }else{
                	PProxy.FallbackObject[Name]=Value;
                }
            },
        });
    }
    NewProperty(Name,Value,Options={}){
    	this.Properties[Name]={
        	Value:Value,
            Name:Name,
			OnGet:Options.OnGet,
            OnSet:Options.OnSet,
        }
    }
    RemoveProperty(Name){
    	delete this.Properties[Name];
    }
    IsProperty(Name){
    	return this.Properties.hasOwnProperty(Name);
    }
}
