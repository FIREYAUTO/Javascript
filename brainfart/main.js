/*
Brainfart is a custom programming language that is just brainfuck with custom tokens.

Every brainfuck token is the same (Normal brainfuck can run perfectly fine)

Custom Tokens:

* //Break current loop if mem add value is 0
$ //Toggle ToChar (When you use ".", it will determine whether or not it's a byte or a char)
@ //Toggle IsStrict (When you use math or ops, after the operation is complete it will set the next mem add value to 0)
: //Add (Adds the current mem add value and the next mem add value)
; //Sub (Subtracts the current mem add value and the next mem add value)
' //Mul (Multiplies the current mem add value and the next mem add value)
/ //Div (Divides the current mem add value and the next mem add value)
% //Mod (Mods the current mem add value and the next mem add value)
^ //Exp (Exps the current mem add value and the next mem add value)
= //Loops the next token the next mem add value amount of times
~ //Sets the current mem add value to 0
! //Not operation, sets the current mem add value to the opposite of the current value (0 or 1)
& //And operation, sets the current mem add value to the and operation on the current value and the next value (0 or 1)
| //Or operation, sets the current mem add value to the or operation on the current value and the next value (0 or 1)
?<+ or -> //Depending on which token is in front, it will increment or decrement the Function memory address
{ //Open a function block, stores in the current fmem  add value
} //Close a function block
_ //Call the current fmem add value
# //Toggle IsFloor (After a math operation, it will determine whether or not the result is set to the floor of the result)

Interprerter Written by FIREYAUTO

*/

function InterpretLanguage(Code,Input=""){
	let CodeMatch="",CodeTokens = ["+","-","<",">",".",",","]","[","*","$","@",":",";","'","/","%","^","=","~","!","&","|","?","{","}","_","#"];
    for (let k in CodeTokens){let v = CodeTokens[k];CodeMatch += `\\${v}`}
    const Memory = new Proxy([],{
    	get:function(self,Name){
        	let Value = Reflect.get(self,Name);
        	if (Value == undefined){
            	Reflect.set(self,Name,0);
                return 0;
            }
            return Value
        },
        set:function(self,Name,Value){
        	Reflect.set(self,Name,Value);
        }
    });
    let MemoryAddress=0,MatchExpression=`[^${CodeMatch}]`,ReadInt=0,ToChar=false,IsStrict=false,FMemory=[],FMAdd=0,IsFloor=true;
    Code = Code.replace(new RegExp(MatchExpression,"g"),"");
    function CreateMemoryAddress(Address){Memory[Address]}
    CreateMemoryAddress(MemoryAddress);
    function Read(){let Value = Input.substr(ReadInt,1).charCodeAt(0);ReadInt++;return Value||0}
    const Tokens = {
    	">":function(){MemoryAddress++;CreateMemoryAddress(MemoryAddress)},
        "<":function(){MemoryAddress--;CreateMemoryAddress(MemoryAddress)},
        "+":function(){Memory[MemoryAddress]++},
        "-":function(){Memory[MemoryAddress]--},
        ".":function(){document.write(ToChar?String.fromCharCode(Memory[MemoryAddress]):Memory[MemoryAddress])},
        ",":function(){Memory[MemoryAddress]=Read()},
        "$":function(){ToChar=!ToChar},
        "@":function(){IsStrict=!IsStrict},
        "#":function(){IsFloor=!IsFloor},
        "~":function(){Memory[MemoryAddress]=0},
        //Math Tokens
        ":":function(){Memory[MemoryAddress]+=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        ";":function(){Memory[MemoryAddress]-=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        "'":function(){Memory[MemoryAddress]*=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        "/":function(){Memory[MemoryAddress]/=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        "%":function(){Memory[MemoryAddress]%=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        "^":function(){Memory[MemoryAddress]**=Memory[MemoryAddress+1];IsFloor?Memory[MemoryAddress]=Math.floor(Memory[MemoryAddress]):false;IsStrict?Memory[MemoryAddress+1]=0:false},
        //Operator Tokens
        "!":function(){Memory[MemoryAddress]=+!Memory[MemoryAddress]==0?0:1},
        "&":function(){Memory[MemoryAddress]=+(Memory[MemoryAddress]&&Memory[MemoryAddress+1])==0?0:1},
        "|":function(){Memory[MemoryAddress]=+(Memory[MemoryAddress]||Memory[MemoryAddress+1])==0?0:1},
    }
    let Skip=[],p=1;
    function Parse(i){
    	let Raw = Code.substr(i,1);
        if (Raw == "["){
        	if (Memory[MemoryAddress]!=0){
            	while(Memory[MemoryAddress]!=0){
                	let ii=i+1,o=false;
                    let r=Code.substr(ii,1);
                    let fskip=[];
                    do {
                    	if (fskip.includes(ii)){
                        	let c = Code.substr(ii);
                            Skip.push(ii);
                        	ii++,r=Code.substr(ii,1);
                            if (r == "]"){
                            	ii++,r=Code.substr(ii,1);
                            }
                        } else {
                        	if (r=="["){
                        		let x=ii+1,op=1;
                    			let xr=Code.substr(x,1);
                    			while(op>=1){
                    				if (xr=="["){op++}
                        			if (xr=="]"){op--}
                        			if (op<1){break}
                        			fskip.push(x);
                        			x++,xr=Code.substr(x,1);
                    			}
                                fskip.push(x);
                        	}
                    		if (r=="*" && Memory[MemoryAddress]==0){o=true}
                        	Skip.push(ii);
                        	if (!o){Parse(ii)};
                        	ii++,r=Code.substr(ii,1);
                        }
                    } while (r!="]");
                }
            } else {
            	let o=1,ii=i+1;
                let r=Code.substr(ii,1);
                while (o>=1){
                	if (r=="["){o++}
                    if (r=="]"){o--}
                    if (o<1){break}
                    Skip.push(ii);
                    ii++,r=Code.substr(ii,ii)
                }
            }
        } else if (Raw == "{"){
            let o=1,ii=i+1;
            let r=Code.substr(ii,1);
            let start=ii;
            while (o>=1){
            	if (r=="{"){o++}
                if (r=="}"){o--}
                if (o<1){break}
                Skip.push(ii);
                ii++,r=Code.substr(ii,1);
            }
            ii-=1;FMemory[FMAdd]=[start,ii];Skip.push(ii+1);
        } else if (Raw=="?"){
            let ii=i+1,nx=Code.substr(ii,1);
            if (nx=="+"){FMAdd++;Skip.push(ii)} else if (nx=="-"){FMAdd--;Skip.push(ii)}
        } else if (Raw=="_"){
        	let f=FMemory[FMAdd],c=FMAdd;
            if (f){
            	let fskip=[];
                for (let o=f[0];o<=f[1];o++){
                	if (fskip.includes(o)){continue}
                    if (Code.substr(o,1)=="_" && FMAdd==c){continue}
                    let r = Code.substr(o,1);
                    if (r == "["){
                    	let oo=1,xi=o+1;
                        let xr = Code.substr(xi,1);
                        while (oo>=1){
                        	if (xr=="["){oo++}
                            if (xr=="]"){oo--}
                            if (oo<1){break}
                            fskip.push(xi);
                            xi++,xr=Code.substr(xi,1);
                        }
                    }
                    Parse(o);
                }
			}
        } else if (Raw!="]"){
            if (Raw=="="){
            	Skip.push(i+1);
                for (let o=0;o<=Memory[MemoryAddress+1]-1;o++){
                	Parse(i+1);
                }
            } else {
            	let t=Tokens[Raw];
                if (t){t()}
            }
        }
    }
    for (let i=0;i<=Code.length-1;i++){
    	if (!Skip.includes(i)){Parse(i);p=i}
    }
}

InterpretLanguage(`>+[>,*.<<[-]+++++++++++++$.$>]`,"Hello, world!")
