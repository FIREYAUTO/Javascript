/*
language.js library example
Simple mathmatical expressional parsing.
*/

//{{ Language Testing }}\\

const l = new Language("Math Expression Reader");
l.newTypes("Whitespace","Identifier","Bracket","Operator","Syntax","Keyword");
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
    Language.token("bopen","{",l.types.Bracket),
    Language.token("bclose","}",l.types.Bracket),
    Language.token("iopen","[",l.types.Bracket),
    Language.token("iclose","]",l.types.Bracket),
    //{{ Syntax Tokens }}\\
    Language.token("comma",",",l.types.Syntax),
    Language.token("dot",".",l.types.Syntax),
    Language.token("range","..",l.types.Syntax),
    Language.token("lineend",";",l.types.Syntax),
    //{{ Operator Tokens }}\\
    Language.token("add","+",l.types.Operator),
    Language.token("sub","-",l.types.Operator),
    Language.token("mul","*",l.types.Operator),
    Language.token("div","/",l.types.Operator),
    Language.token("pow","^",l.types.Operator),
    Language.token("mod","%",l.types.Operator),
    Language.token("eq","=",l.types.Operator),
    Language.token("prime","'",l.types.Operator),
    
    Language.token("eqs","==",l.types.Operator),
    Language.token("geq",">=",l.types.Operator),
    Language.token("leq","<=",l.types.Operator),
    Language.token("gt",">",l.types.Operator),
    Language.token("lt","<",l.types.Operator),
    Language.token("not","!",l.types.Operator),
    Language.token("neq","!=",l.types.Operator),
    Language.token("and","&",l.types.Operator),
    Language.token("or","|",l.types.Operator),
    //{{ Keyword Tokens }}\\
    Language.token("func","fn",l.types.Keyword),
    Language.token("each","each",l.types.Keyword)
);
l.defaultType = "Identifier";
l.setTokenizerFinish((stream,tokens)=>{
	tokens = tokens.filter(x=>x.type!=l.types.Whitespace);
    let nt = [];
    let p = 0;
    while(p<=tokens.length-1){
    	let t = tokens[p];
        if(t.type=="Identifier"){
        	if(!isNaN(+t.value)){
            	p++;
            	let nt = tokens[p];
                if(nt&&nt.type=="Syntax"&&nt.name=="dot"){
                	p++;
                    let nn = tokens[p];
                    if(isNaN(nn.value)){
                    	throw new Error("Invalid Number Sequence");
                    }
                    t.value = `${t.value}.${nn.value}`;
                }else{
                	p--;
                }
            }
        }else if(t.type=="Syntax"&&t.name=="dot"){
        	p++;
            let nn = tokens[p];
            if(!nn||isNaN(nn.value)||nn.type!="Identifier"){
            	throw new Error("Invalid Number Sequence");
            }
            t.value = `0.${nn.value}`;
            t.type="Identifier";
            t.name=t.value;
        }
    	nt.push(t);
    	p++;
    }
    return nt;
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
    	priority:30,
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
    	priority:20,
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
    	priority:50,
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
    	priority:40,
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
    	priority:40,
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
    	priority:60,
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
    "popen":{
    	priority:90,
        call:(stream,value,p)=>{
            stream.next(2);
            let close = l.getToken("pclose");
            let comma = l.getToken("comma");
            let args = [];
            if(!l.eq(stream.token(),close)){
            	while(!stream.isEnd()){
                	if(l.eq(stream.token(),close)){
                    	throw new Error("Unexpected )");
                    }
                    let x = l.parseExpression(stream,stream.token(),undefined,true);
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
            let result = stream.astNode();
            result.type = "call";
            result.write("func",value);
            result.write("args",args);
            return l.exp(result,p);
        }
    },
    "range":{
    	priority:19,
        call:(stream,value,p)=>{
        	stream.next(2);
            let v = l.parseExpression(stream,stream.token(),p,true);
            let result = stream.astNode();
            result.type = "range";
            result.write("v1",value);
            result.write("v2",v);
           	return l.exp(result,p);
        },
    },
    "iopen":{
    	priority:18.75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let v = l.parseExpression(stream,stream.token(),undefined,true);
            l.testNext(stream,l.getToken("iclose"));
            stream.next();
            let result = stream.astNode();
            result.type = "index";
            result.write("v1",value);
            result.write("v2",v);
            return l.exp(result,p);
        },
    },
    "eq":{
    	priority:18.5,
        call:(stream,value,p)=>{
        	stream.next(2);
            let v = l.parseExpression(stream,stream.token());
            let result = stream.astNode();
            result.type="setvalue";
            result.write("v1",value);
            result.write("v2",v);
            return l.exp(result,p);
        },
    },
    "prime":{
    	priority:100,
        call:(stream,value,p)=>{
        	stream.next();
        	let result = stream.astNode();
            result.type="prime";
            result.write("v1",value);
            return l.exp(result,-1);
        },
    },
    "eqs":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "eqs";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "leq":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "leq";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "geq":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "geq";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "gt":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "gt";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "lt":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "lt";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "neq":{
    	priority:75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "neq";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "and":{
    	priority:74,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "and";
            node.write("v1",value);
            node.write("v2",exp);
            return l.exp(node,p);
        }
    },
    "or":{
    	priority:74,
        call:(stream,value,p)=>{
        	stream.next(2);
            let exp = l.parseExpression(stream,stream.token(),p);
            let node = stream.astNode();
            node.type = "or";
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
        if(!l.eq(n,l.getToken(k))){continue}
        if(value.priority<=v.priority){
        	value = v.call(stream,value.value,v.priority);
            value.priority = -1;
            let r = l.parseComplexExpression(stream,value);
            value = l.exp(r,v.priority);
            break;
        }else{
        	break;
        }
    }
	return value.value;
}
l.codeBlock = function(stream,token){
	if(l.eq(token,l.getToken("bopen"))){
    	let block = stream.astBlock();
        let close = l.getToken("bclose");
        while(!stream.isEnd()&&!l.eq(stream.token(),close)){
        	let t = stream.token();
           	block.write(l.parseExpression(stream,t,-1));
            if(l.eq(stream.getNext(),l.getToken("lineend"))){
    			stream.next();
    		}
            stream.next();
        }
        if(!l.eq(stream.token(),close)){
        	throw new Error(`Expected } to close {`);
        }
        return block;
    }else{
    	let block = stream.astBlock();
        block.write(l.parseExpression(stream,stream.token(),-1));
        if(l.eq(stream.getNext(),l.getToken("lineend"))){
    		stream.next();
    	}
        return block;
    }
}
l.identifierList = function(stream){
	let list = [];
    let comma = l.getToken("comma");
	while(!stream.isEnd()){
    	let t = stream.token();
        if(t.type!="Identifier"){
        	throw new Error(`Expected Identifier, got ${t.type} instead`);
        }
        list.push(t.value);
        t=stream.getNext();
        if(l.eq(t,comma)){
        	stream.next(2);
            continue;
        }
        break;
    }
    return list;
}
l.parseExpression = function(stream,token,priority=-1,nocomma=false){
	let result = 0;
	if(token.type==l.types.Identifier){
    	let v = token.value;
        if(!isNaN(+v)){
        	result = +v;
        }else{
        	let n = stream.getNext();
        	if(l.eq(n,l.getToken("eq"))){
            	stream.next(2);
                let v = l.parseExpression(stream,stream.token(),18);
                result = stream.astNode();
                result.type="var"
                result.write("name",token.value);
                result.write("value",v);
                return result;
            }else{
            	result = stream.astNode();
                result.type="getvar";
                result.write("name",token.value);
            }
        }
    } else if(l.eq(token,l.getToken("popen"))){
    	stream.next();
        result = l.parseExpression(stream,stream.token());
        //priority=-1;
        stream.next();
        if(!l.eq(stream.token(),l.getToken("pclose"))){
        	throw new Error("Expected ) to close (");
        }
    } else if(l.eq(token,l.getToken("sub"))){
    	stream.next();
        result = l.parseExpression(stream,stream.token(),80,true);
       	let ch = stream.astNode();
        ch.write("v1",result);
        ch.type = "neg";
        result = ch;
    } else if(l.eq(token,l.getToken("not"))){
    	stream.next();
        result = l.parseExpression(stream,stream.token(),74,true);
       	let ch = stream.astNode();
        ch.write("v1",result);
        ch.type = "not";
        result = ch;
    }else if(token.type==l.types.Keyword){
    	if(l.eq(token,l.getToken("func"))){
        	l.testNext(stream,l.getToken("popen"));
            stream.next(2);
            let params = [];
            let close = l.getToken("pclose");
            let comma = l.getToken("comma");
            while(!stream.isEnd()&&!l.eq(stream.token(),close)){
            	let t = stream.token();
                if(l.eq(t,close)){throw new Error("Unexpected )")}
                l.typeTest(t,l.types.Identifier);
                if(!l.isIdentifierString(t.value)){
                	throw new Error(`Unexpected parameter name ${t.value}`);
                }
                params.push(t.value);
                stream.next();
                t = stream.token();
                if(l.eq(t,comma)){
                	stream.next();
                    continue;
                }else if(!l.eq(t,close)){
                	throw new Error(`Expected a , for new parameters`);
                }
            }
            if(!l.eq(stream.token(),close)){
            	throw new Error(`Expected ) to close (`);
            }
            stream.next();
            let body = l.codeBlock(stream,stream.token());
            let fn = stream.astNode();
            fn.type="func";
            fn.write("params",params);
            fn.write("body",body);
            return fn;
        }else if(l.eq(token,l.getToken("each"))){
        	stream.next();
            let b = stream.astNode();
            b.type = "each";
            let iter = l.parseExpression(stream,stream.token(),undefined,true);
            b.write("iter",iter);
            stream.next();
            let vars = l.identifierList(stream);
            stream.next();
            let body = l.codeBlock(stream,stream.token());
            b.write("vars",vars);
            b.write("body",body);
            return b;
        }
    }else if(l.eq(token,l.getToken("iopen"))){
    	let arr = stream.astNode();
        arr.type = "list";
        let list = [];
        let close = l.getToken("iclose");
        let comma = l.getToken("comma");
        stream.next();
        while(!stream.isEnd()&&!l.eq(stream.token(),close)){
            let t = stream.token();
            if(l.eq(t,close)){throw new Error("Unexpected ]")}
            list.push(l.parseExpression(stream,t,undefined,true));
            stream.next();
            t = stream.token();
            if(l.eq(t,comma)){
                stream.next();
                continue;
            }else if(!l.eq(t,close)){
                throw new Error(`Expected a , for new list elements`);
            }
        }
        arr.write("body",list);
        result = arr;
    }
    if(!nocomma&&priority==-1){
    	let n = stream.getNext();
        let c = l.getToken("comma");
        if(l.eq(n,c)){
        	let b = stream.astBlock();
            b.type="commaexp"
        	b.write(result);
        	stream.next(2);
        	while(!stream.isEnd()){
            	b.write(l.parseExpression(stream,stream.token()));
                let nt = stream.getNext();
                if(l.eq(nt,c)){
                	stream.next(2);
                	continue;
                }
                break;
            }
            result = b;
        }
    }
    return this.parseComplexExpression(stream,l.exp(result,priority));
}
l.checkNext=function(stream,check){
	return l.eq(stream.getNext(),check);
}
l.testNext=function(stream,check){
	if(!l.checkNext(stream,check)){
    	throw new Error(`Expected token ${check.value}`);
    }
}
l.typeTest=function(token,type){
	if(token.type!=type){
    	throw new Error(`Expected ${type}, got ${token.type} instead`);
    }
}
l.setAstFallback((stream,token)=>{
	token=token||stream.token();
    stream.write(l.parseExpression(stream,token));
   	if(l.eq(stream.getNext(),l.getToken("lineend"))){
    	stream.next();
    }
})
l.newState({
	token:l.getToken("add"),
    interpret:{
    	callback:(stream,t)=>{
        	t = t||stream.token();
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
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
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
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
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
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
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
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
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
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
        	let v1 = l.interpret(t.read("v1"),stream);
            let v2 = l.interpret(t.read("v2"),stream);
            return v1**v2;
        },
        type:"pow",
    },
});
l.interpretMethod("call",(stream,token)=>{
	token=token||stream.token();
    let m = l.interpret(token.read("func"),stream);
    let a = [];
    for(let v of token.read("args")){
    	a.push(l.interpret(v,stream));
    }
    if(m){
    	let r = m(...a);
    	stream.write("_res",r);
        return r;
    }
});
l.interpretMethod("neg",(stream,token)=>{
	token=token||stream.token();
    return -l.interpret(token.read("v1"),stream);
});
l.interpretMethod("getvar",(stream,token)=>{
	token=token||stream.token();
    return stream.vars[token.read("name")];
});
l.interpretMethod("var",(stream,token)=>{
	token=token||stream.token();
  	let v = l.interpret(token.read("value"),stream);
    stream.vars[token.read("name")]=v;
    return v;
});
l.interpretMethod("func",(stream,token)=>{
	token=token||stream.token();
    let params = token.read("params");
    let body = token.read("body");
    return function(...a){
    	for(let k in params){
        	let v = params[k];
            let av = +a[k];
            body.vars[v]=av;
        }
        let r = l.interpret(body,stream);
        return r.read("_res");
    }
});
l.interpretMethod("commaexp",(stream,token)=>{
	token=token||stream.token();
    return l.interpret(token,stream).read("_res");
});
l.interpretMethod("range",(stream,token)=>{
	token=token||stream.token();
    let v1 = l.interpret(token.read("v1"),stream);
    let v2 = l.interpret(token.read("v2"),stream);
    let r = [];
    for(let i=v1;i<=v2;i++){
    	r.push(i);
    }
    return r;
});
l.interpretMethod("index",(stream,token)=>{
	token=token||stream.token();
    let v1 = l.interpret(token.read("v1"),stream);
    let v2 = l.interpret(token.read("v2"),stream);
    return +v1[v2-1];
});
l.interpretMethod("setvalue",(stream,token)=>{
	token=token||stream.token();
    let v1 = token.read("v1");
    if(v1.type!="index"){
    	throw new Error(`You can only set indexes in lists!`);
    }
    let v2 = l.interpret(token.read("v2"),stream);
    let o = l.interpret(v1.read("v1"),stream);
    let i = l.interpret(v1.read("v2"),stream);
    o[i-1]=v2;
    return o[i-1];
});
l.interpretMethod("list",(stream,token)=>{
	token=token||stream.token();
    let list = [];
    for(let v of token.read("body")){
    	list.push(l.interpret(v,stream));
    }
    return list;
});
l.interpretMethod("prime",(stream,token)=>{
	token=token||stream.token();
    let v1 = l.interpret(token.read("v1"),stream);
    if(typeof v1!="function"){
    	throw new Error("Cannot take a derivative of a non-function");
    }
    let _d=0.00000009;
    return function(x){
    	return Math.nround((v1(x+_d)-v1(x))/_d,5);
    }
});
l.interpretMethod("eqs",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1==v2?1:0;
});
l.interpretMethod("geq",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1>=v2?1:0;
});
l.interpretMethod("leq",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1<=v2?1:0;
});
l.interpretMethod("lt",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1<v2?1:0;
});
l.interpretMethod("gt",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1>v2?1:0;
});
l.interpretMethod("neq",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    let v2 = l.interpret(t.read("v2"),stream);
    return v1!=v2?1:0;
});
l.interpretMethod("not",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    return !v1?0:1;
});
l.interpretMethod("and",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    if(v1){
    	let v2 = l.interpret(t.read("v2"),stream);
    	return v1&&v2;
    }
    return v1;
});
l.interpretMethod("or",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    if(!v1){
    	let v2 = l.interpret(t.read("v2"),stream);
    	return v1||v2;
    }
    return v1;
});
l.interpretMethod("each",(stream,t)=>{
	t=t||stream.token();
    let iter = l.interpret(t.read("iter"),stream);
    let vars = t.read("vars");
    let body = t.read("body");
    for(let i=0;i<=iter.length-1;i++){
    	let vs=[i+1,iter[i]];
        for(let k in vs){
            body.vars[vars[k]]=vs[k];
        }
        l.interpret(body,stream);
    }
});

Math.nround=function(x,y=0){
	let m = 10**y;
    return Math.floor(x*m+0.5)/m;
}

l.globals = {
	sin:Math.sin,
    cos:Math.cos,
    tan:Math.tan,
    rnd:Math.random,
    acos:Math.acos,
    asin:Math.asin,
    log:function(...a){
    	document.write(a.join(" "),"<br>");
    },
    sqrt:Math.sqrt,
    pi:Math.PI,
    e:Math.E,
}

let t = l.tokenize(`
x=1..3;
each x k,v log(k,v);
x
`);
let a = l.ast(t);
let i = l.interpret(a._result,undefined,a);
document.write(i.read("_res"));
