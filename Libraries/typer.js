/*
typer.js file
  Programmed by FIREYAUTO on 11/30/21 (November 30th, 2021)
  
This JS script allows for custom typing in elements.
*/
String.prototype.splice = function(i,r,s){
	return this.slice(0,i)+s+this.slice(i+Math.abs(r));
}

class InputObject {
	constructor(KeyName,KeyCode,Options={},Event){
    	this.KeyName = KeyName;
        this.KeyCode = KeyCode;
        this.Options = Options;
        this.Event = Event;
    }
    IsAlt(){return this.Options.AltKey===true}
    IsCtrl(){return this.Options.CtrlKey===true}
    IsShift(){return this.Options.ShiftKey===true}
    IsMeta(){return this.Options.MetaKey===true}
    IsRepeating(){return this.Options.Repeating===true}
    IsSpecial(){return this.KeyName.length>1}
    IsCommand(){return this.IsCtrl()&&"acxzvyf".split("").includes(this.KeyName.toLowerCase())}
    IsNav(){return["ArrowLeft","ArrowUp","ArrowDown","ArrowRight"].includes(this.KeyName)}
    PreventDefault(){
    	this.Event.preventDefault();
        this.Options.Prevented=true;
    }
}

function InputObjectInformal(Event){
	return new InputObject(Event.key,Event.keyCode||Event.which,{
    	AltKey:Event.altKey,
        CtrlKey:Event.ctrlKey,
        ShiftKey:Event.shiftKey,
        MetaKey:Event.metaKey,
        Repeating:Event.repeat,
    },Event);
}

class Typer {
	constructor(Element){
    	this.Element = Element;
        this.Hooks={
        	KeyDown:[],
            KeyUp:[],
        };
	this.FinishHooks={
		KeyDown:[],
		KeyUp:[],
	};
        this.AdjacentReciever = undefined;
        Element.addEventListener("keydown",Event=>{
        	this.KeyDown(InputObjectInformal(Event));
        });
        Element.addEventListener("keyup",Event=>{
        	this.KeyUp(InputObjectInformal(Event));
        });
    }
    _FireHook(Type,...Arguments){
    	if(this.Hooks.hasOwnProperty(Type)){
        	for(let Callback of this.Hooks[Type]){
            	Callback(...Arguments);
            }
        }
    }
    _FireFinishHook(Type,...Arguments){
    	if(this.FinishHooks.hasOwnProperty(Type)){
        	for(let Callback of this.FinishHooks[Type]){
            	Callback(...Arguments);
            }
        }
    }
    GetSelection(){
    	return {Start:this.Element.selectionStart,End:this.Element.selectionEnd};
    }
    KeyDown(Input){
    	this._FireHook("KeyDown",Input);
        if(Input.Event.defaultPrevented||Input.Options.Prevented===true){return}
        let Text = this.Element.value||this.Element.innerHTML;
        if(this.AdjacentReciever){
        	Text = this.AdjacentReciever(this,Text);
        }
        let {Start,End}=this.GetSelection();
        if(Input.IsNav()){return}
        if(!Input.IsSpecial()){
        	if(Input.IsCommand()){return}
        	Text = Text.splice(Start,0,Input.KeyName);
        	if(this.Element.value!=undefined){
        		this.Element.value=Text;
        	}else{
        		this.Element.innerHTML=Text;
        	}
            Input.PreventDefault();
        }
	this._FireFinishHook("KeyDown");
    }
    KeyUp(Input){
    	this._FireHook("KeyUp",Input);
        if(Input.Event.defaultPrevented||Input.Options.Prevented===true){return}
        Input.PreventDefault();
	this._FireFinishHook("KeyUp");
    }
    NewHook(Type,Callback){
    	if(this.Hooks.hasOwnProperty(Type)){
        	this.Hooks[Type].push(Callback);
        }
    }
    NewFinishHook(Type,Callback){
    	if(this.FinishHooks.hasOwnProperty(Type)){
        	this.FinishHooks[Type].push(Callback);
        }
    }
}
