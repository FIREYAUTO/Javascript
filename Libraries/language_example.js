/*
language.js library example
Simple mathmatical expressional parsing.
*/

//{{ Language Testing }}\\

const l = new Language("Math Expression Reader");
l.newTypes("Whitespace","Identifier","Bracket","Operator","Syntax");
l.newTokens(
	//{{ Whitespace Tokens }}\\
	Language.token("__w1"," ",l.types.Whitespace),
    Language.token("__w2",String.fromCharCode(9),l.types.Whitespace),
    Language.token("__w3",String.fromCharCode(10),l.types.Whitespace),
    Language.token("__w4",String.fromCharCode(11),l.types.Whitespace),
    Language.token("__w5",String.fromCharCode(12),l.types.Whitespace),
    Language.token("__w6",String.fromCharCode(13),l.types.Whitespace),
    Language.token("__w7",String.fromCharCode(133),l.types.Whitespace),
    //{{ Bracket Tokens }}\\
    Language.token("popen","(",l.types.Bracket),
    Language.token("pclose",")",l.types.Bracket),
    //{{ Syntax Tokens }}\\
    Language.token("comma",",",l.types.Syntax),
    //{{ Operator Tokens }}\\
    Language.token("add","+",l.types.Operator),
    Language.token("sub","-",l.types.Operator),
    Language.token("mul","*",l.types.Operator),
    Language.token("div","/",l.types.Operator),
    Language.token("pow","^",l.types.Operator),
    Language.token("mod","%",l.types.Operator)
);
l.defaultType = "Identifier";
l.setTokenizerFinish((stream,tokens)=>{
	return tokens.filter(x=>x.type!=l.types.Whitespace);
});

class Expression {
	constructor(priority,value){
    	this.priority=priority;
        this.value=value;
    }
}

l.exp = function(value,priority){
	return new Expression(priority,value);
}
//PEMDAS
l.complexExps = {
	"add":{
    	priority:1,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "add";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "sub":{
    	priority:0,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "sub";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "mul":{
    	priority:3,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "mul";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "div":{
    	priority:2,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "div";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "mod":{
    	priority:2,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "mod";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "pow":{
    	priority:4,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "pow";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
}
l.parseComplexExpression = function(stream,value){
	if(!(value instanceof Expression)){
    	return value;
    }
    let n = stream.getNext();
    if(!n){return value.value}
    for(let k in l.complexExps){
    	let v = l.complexExps[k];
        if(value.priority<=v.priority&&l.eq(n,l.getToken(k))){
        	value = v.call(stream,value.value,v.priority);
            value.priority = -1;
            let r = l.parseComplexExpression(stream,value);
            value = l.exp(r,v.priority);
            break;
        }
    }
	return value.value;
}
l.parseExpression = function(stream,token,priority=-1){
	let result = 0;
	if(token.type==l.types.Identifier){
    	let v = token.value;
        if(!isNaN(+v)){
        	result = +v;
        }else{
        	let n = stream.getNext();
            if(l.eq(n,l.getToken("popen"))){
            	stream.next(2);
                let close = l.getToken("pclose");
                let comma = l.getToken("comma");
                let args = [];
                if(!l.eq(stream.token(),close)){
                	while(!stream.isEnd()){
                    	if(l.eq(stream.token(),close)){
                        	throw new Error("Unexpected )");
                        }
                        let x = l.parseExpression(stream,stream.token());
                		args.push(x);
                    	stream.next();
                    	let t = stream.token();
                    	if(l.eq(t,comma)){
                    		stream.next();
                        	continue;
                    	}else if(!l.eq(t,close)){
                        	throw new Error("Expected expression after comma!");
                        }
                    	if(l.eq(stream.token(),close)){
                    		break;
                    	}
                	}
                }
                if(!l.eq(stream.token(),l.getToken("pclose"))){
        			throw new Error("Expected ) to close (");
        		}
                result = stream.astNode();
            	result.type = "call";
            	result.write("name",token.value);
            	result.write("args",args);
            }
        }
    } else if(l.eq(token,l.getToken("popen"))){
    	stream.next();
        result = l.parseExpression(stream,stream.token());
        stream.next();
        if(!l.eq(stream.token(),l.getToken("pclose"))){
        	throw new Error("Expected ) to close (");
        }
    } else if(l.eq(token,l.getToken("sub"))){
    	stream.next();
        result = l.parseExpression(stream,stream.token(),5);
       	let ch = stream.astNode();
        ch.write("v1",result);
        ch.type = "neg";
        result = ch;
    }
    return this.parseComplexExpression(stream,l.exp(result,priority));
}
l.setAstFallback((stream,token)=>{
	token=token||stream.token();
    stream.write(l.parseExpression(stream,token));
})
l.newState({
	token:l.getToken("add"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1+v2;
        },
        type:"add",
    },
});
l.newState({
	token:l.getToken("sub"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1-v2;
        },
        type:"sub",
    },
});
l.newState({
	token:l.getToken("mul"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1*v2;
        },
        type:"mul",
    },
});
l.newState({
	token:l.getToken("div"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1/v2;
        },
        type:"div",
    },
});
l.newState({
	token:l.getToken("mod"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1%v2;
        },
        type:"mod",
    },
});
l.newState({
	token:l.getToken("pow"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"));
            let v2 = l.interpret(t.read("v2"));
            return v1**v2;
        },
        type:"pow",
    },
});
l.callMethods = {
	sin:function(x){
    	return Math.sin(x);
    },
    log:function(...a){
    	document.write(a.join(" "),"<br>");
    },
}
l.interpretMethod("call",(stream,token)=>{
	token=token||stream.token();
    let m = l.callMethods[token.read("name")];
    let a = [];
    for(let v of token.read("args")){
    	a.push(l.interpret(v));
    }
    if(m){
    	let r = m(...a);
    	stream.write("res",r);
        return r;
    }
});
l.interpretMethod("neg",(stream,token)=>{
	token=token||stream.token();
    return -l.interpret(token.read("v1"));
});

let t = l.tokenize(`log(-sin(90))`);
let a = l.ast(t);
let i = l.interpret(a);
