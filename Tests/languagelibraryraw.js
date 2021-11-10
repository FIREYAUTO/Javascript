//{{ Backend Classes }}\\

//LanguageTokenBase -> Default Token
class LanguageTokenBase {
	constructor(Name,Value,Type){
    	this.name = Name;
        this.value = Value;
        this.type = Type;
        this.rawValue=Value;
    }
}

//LanguageToken -> Tokenized Token
class LanguageToken extends LanguageTokenBase {
	constructor(name,value,type){
    	super(name,value,type);
    }
}
LanguageToken.prototype.toString = function(){
	return `name: "${this.name}", value: "${this.value}", type: "${this.type}"`;
}

//LanguageError -> Default error
class LanguageError extends Error {
	constructor(Message,Name){
    	super(Message).name = Name||this.constructor.name;
    }
}

//LanguageStream -> Tokenizer token stream
class LanguageStream {
	constructor(LanguageReference,Tokens){
    	this._language = LanguageReference;
        this._position = 0;
        this._rawTokens = Tokens;
        this.tokens = [];
        this._cToken = Tokens[0];
    }
    setValue(value){
    	if(this._cToken){
        	this._cToken.value = value;
        }
    }
    setName(name){
    	if(this._cToken){
        	this._cToken.name = name;
        }
    }
    setType(type){
    	if(this._cToken){
        	this._cToken.type = type;
        }
    }
    token(){
    	return this._cToken;
    }
    next(amount=1){
    	this._position+=amount;
        this._cToken=this._rawTokens[this._position];
    }
    isEnd(){
    	return this._position > this._rawTokens.length-1;
    }
    isToken(token,value,type){
    	return this._language.isToken(token,value,type);
    }
    eq(...a){
    	return this._language.eq(...a);
    }
    close(){
    	if(this._cToken){
        	this.tokens.push(this._cToken);
            this._cToken = undefined;
        }
    }
    add(t){
    	this.tokens.push(t);
    }
    between(sets){
    	let {start,end,allowEscape:ae,appendCaptures:ac}=sets;
        let result = [];
        let tt = this._cToken;
        this.next();
        while(!this.isEnd()&&!this.eq(this._cToken,end)){
        	let t = this._cToken;
            if(ae){
            	let esc = this._language._escapeToken;
            	if(esc&&this.eq(t,esc)){
                	this.next();
                    t=this._cToken;
                }
            }
            result.push(t);
            this.next();
        }
        if (!this.eq(this._cToken,end)){
        	this._language._error("LanguageSyntaxError",`Expected ${end.value}, got ${this._cToken?this._cToken.rawValue:"EOS"} instead`);
        }
        if(ac){
        	result.unshift(tt);
            result.push(this._cToken);
        }
        return result;
    }
}

class LanguageTree {
	constructor(Language,Tokens=[]){
    	this._language = Language;
        this._rawTokens = Tokens;
        this._position=0;
        this._cToken = Tokens[0];
        this._chunks = [];
        this.rawvars={};
        this.vars = this.rawvars;
        this._result = new LanguageASTBlock(this,this.vars);
        this._chunk = this._result;
    }
    setType(t){
    	this._chunk.type = t;
    }
    next(amount=1){
    	this._position+=amount;
        this._cToken=this._rawTokens[this._position];
        return this._cToken;
    }
    getNext(){
    	return this._rawTokens[this._position+1];
    }
    openChunk(){
    	this._chunks.push(this._chunk);
        this._chunk = new LanguageASTBlock(this,this.vars);
    }
    closeChunk(){
    	if(this._chunks.length>0){
        	let pre = this._chunk;
        	this._chunk=this._chunks.pop();
            this._chunk.write(pre);
        }
    }
    write(x){
    	this._chunk.write(x);
    }
    astNode(){
    	return new LanguageASTNode(this,this.vars);
    }
    astBlock(){
    	return new LanguageASTBlock(this,this.vars);
    }
    isEnd(){
    	return this._position>this._rawTokens.length-1;
    }
    token(){
    	return this._cToken;
    }
}

class LanguageAST {
	constructor(type,parent,vars){
        this._type = type;
        this.stream = parent;
        this._readInners = false;
        this._innerNames = [];
        this.type = "ast";
        this.interpret = undefined;
        let a = this;
        this.rawvars = {};
        this.vars = new Proxy(this.rawvars,{
        	set:function(self,n,v){
            	if(!Object.prototype.hasOwnProperty.call(self,n)){
                	if(a.parent){
                    	a.parent.vars[n]=v;
                    }else if(a.stream){
                    	a.stream.vars[n]=v;
                    }else{
                    	vars[n]=v;
                    }
                }else{
                	self[n]=v;
                }
            },
            get:function(self,n){
            	if(Object.prototype.hasOwnProperty.call(self,n)){
                	return self[n];
                }
                if(a.parent){
                	return a.parent.vars[n];
                }else if(a.stream){
                	return a.stream.vars[n];
                }
            }
        });
    }
    readInners(bool){
    	this._readInners=!!bool;
    }
    innerName(x){
    	this._innerNames.push(x);
    }
    innerNames(...x){
    	for(let v of x){
        	this.innerName(v);
        }
	}
    each(c){
    	for(let k in this._tree){
        	let v = this._tree[k];
            c(v,k,this._true);
        }
    }
}
LanguageAST.prototype.toString = function(){
	let e = Object.entries(this._tree);
    let res = [`type: ${this.type}`];
    for(let v of e){
    	res.push(`${v[0]}: ${v[1]}`);
    }
    return res.join(", ");
}

class LanguageASTBlock extends LanguageAST {
	constructor(p,v){
    	super("LanguageASTBlock",p,v);
    	this._tree = [];
        this.rawvars = v;
    }
    write(x){
    	this._tree.push(x);
    }
    read(x){
    	return this._tree[x];
    }
    get length(){
    	return this._tree.length;
    }
}

class LanguageASTNode extends LanguageAST {
	constructor(p,v){
    	super("LanguageASTNode",p,v);
        this._tree = {};
    }
    write(n,x){
    	this._tree[n]=x;
    }
    read(n){
    	return this._tree[n];
    }
}

class LanguageReader {
	constructor(language,tokens){
    	this._rawTokens = tokens;
        this._language = language;
        this._cToken = tokens[0];
        this._position = 0;
        this._result = {};
        this.vars = {};
        this.rawvars = this.vars;
    }
    next(amount=1){
    	this._position+=amount;
        this._cToken=this._rawTokens[this._position];
        return this._cToken;
    }
    isEnd(){
    	return this._position>this._rawTokens.length-1;
    }
    token(){
    	return this._cToken;
    }
    write(n,x){
    	this._result[n]=x;
    }
    read(n){
    	return this._result[n];
    }
}

//{{ Language Class }}\\

class Language {
	constructor(Name="Language"){
    	this.name = Name;
        this._tokens = {};
        this.types = {};
        this._escapeToken = undefined;
        this._identifierEscape = /[A-Za-z0-9_]+/g;
        this._mainAstCallback = undefined;
        this.defaultType = "Syntax";
        this._tokenizerFinish = undefined;
        this._astInterpreters={};
    }
    //{{ Static Methods }}\\
    static token(name,value,type){
    	return new LanguageTokenBase(name,value,type);
    }
    //{{ Backend Methods }}\\
    _escape(x){
    	return x.replace(/(\<|\>|\*|\(|\)|\{|\}|\[|\]|\||\=|\?|\&|\^|\$|\\|\-|\+|\.|\'|\")/g,"\\$&");
    }
    _error(type,message){
    	throw new LanguageError(message,type);
    }
    _has(o,n){
    	return Object.prototype.hasOwnProperty.call(o,n);
    }
    _computeToken(code,s){
    	let{i}=s,
        	c=code.substr(i,1),
        	ec = this._escape(c),
            Result=[];
        //Idenitifer Matching
        if(this.isIdentifierString(ec)){
        	let nc = c;
            for(let o=i+(c.length);o<=code.length-1;o++){
            	let ch = code.substr(o,1);
                if(this.isIdentifierString(ch)){
                	nc+=ch;
                }else{
                	break;
                }
            }
            if(this._isTokenValue(nc)){
            	s.i+=nc.length;
            	return nc;
            }else{
            	c=nc;
                ec=this._escape(c);
            }
        }
        //Token Checking
      	for(let k in this._tokens){
        	let v = this._tokens[k];
            if(v.value.match(new RegExp(`^${ec}`))){
            	let matches = 0;
            	for(let o=c.length-1;o<=v.value.length-1;o++){
                	let ch = v.value.substr(o,1);
                    if(code.substr(i+o,1)==ch){
                    	matches++;
                    }else{break}
                }
                if(matches==v.value.length){
                	Result.push(v.value);
                    c=v.value;
                    ec = this._escape(c);
                }
            }
        }
        //Token Returns
        if(Result.length==0){
        	Result.push(c);
        }
        s.i+=c.length;
        return Result.sort().pop();
    }
    _tokenType(x){
    	for(let k in this._tokens){
        	let v = this._tokens[k];
            if(v.value==x){
            	return v.type;
            }
        }
        return this.defaultType;
    }
    _isTokenValue(x){
    	for(let k in this._tokens){
        	let v = this._tokens[k];
            if(v.value==x){
            	return true;
            }
        }
        return false;
    }
    _tokenName(x){
    	for(let k in this._tokens){
        	let v = this._tokens[k];
            if(v.value==x){
            	return v.name;
            }
        }
        return x;
    }
    _applyTokenExtras(n,t,e){
        if(!this._has(this._tokens,n)){return}
        let tk = this._tokens[n];
        for(let v of e){
        	t[v]=tk[v];
        }
    }
    _getAstInterpreter(ast){
    	if(!ast){return ()=>{}}
    	return this._astInterpreters[ast.type];
    }
    //{{ User Methods }}\\
    setTokenizerFinish(callback){
    	this._tokenizerFinish = callback;
    }
    eq(token,rawToken){
    	if(!token||!rawToken){return false}
    	if(rawToken instanceof LanguageToken){
        	return token.value==rawToken.value&&token.type==rawToken.type;
        }else{
        	return token.value==rawToken.name&&token.type==rawToken.type;
        }
    }
    isToken(token,value,type){
    	return token.value==value&&token.type==type;
    }
    isIdentifierString(x){
    	return x.match(this._identifierEscape);
    }
    newToken(token){
    	this._tokens[token.name]=token;
    }
    newTokens(...tokens){
    	for(let v of tokens){
        	this.newToken(v);
        }
    }
    newType(type){
    	this.types[type]=type;
    }
    newTypes(...types){
    	for(let v of types){
        	this.newType(v);
        }
    }
    setAstFallback(Callback){
    	this._mainAstCallback = Callback;
    }
    setEscapeToken(token){
    	if(!(token instanceof LanguageTokenBase)){
        	this._error("LanguageTokenError",`Expected a token`)
        }
        this._escapeToken=token;
    }
    getToken(name){
    	return this._tokens[name];
    }
    newState(sets){
    	if(this._has(sets,"token")){
        	this.newToken(sets.token);
            if(this._has(sets,"tokenize")){
            	sets.token.tokenize = sets.tokenize;
            }
            if(this._has(sets,"ast")){
            	sets.token.ast = sets.ast;
            }
            if(this._has(sets,"interpret")){
            	let int = sets.interpret;
                this._astInterpreters[int.type]=int.callback;
            }
        }
        if(this._has(sets,"tokens")){
        	let {tokenize:to,ast,interpret:int}=sets;
            for(let v of sets.tokens){
            	this.newToken(v);
                to&&(v.tokenize=to);
                ast&&(v.ast=ast);
           	}
            int&&(this._astInterpreters[int.type]=int.callback);
        }
    }
    //{{ Tokenize Method }}\\
   	tokenize(code){
    	let Tokens=[],
        	cl=code.length,
            s={i:0};
        while(s.i<=cl-1){
        	let raw = this._computeToken(code,s);
            let n = this._tokenName(raw)
            let token = new LanguageToken(n,n,this._tokenType(raw));
            token.rawValue = raw;
            this._applyTokenExtras(n,token,["tokenize","ast","interpret"]);
            Tokens.push(token);
        }
        let stream = new LanguageStream(this,Tokens);
        while(!stream.isEnd()){
        	let t = stream._cToken;
            if(this._has(t,"tokenize")&&typeof t.tokenize == "function"){
            	t.tokenize(stream);
            }
            stream.close();
            stream.next();
        }
        let result = undefined;
        if(this._tokenizerFinish){
        	result = this._tokenizerFinish(stream,stream.tokens);
        }
        stream.tokens = result||stream.tokens;
        return stream.tokens;
    }
    //{{ AST Method }}\\
    parseChunk(stream){
    	let t = stream._cToken;
        if(this._has(t,"ast")&&typeof t.ast == "function"){
        	t.ast(stream);
        }else{
        	if(this._mainAstCallback){
            	this._mainAstCallback(stream);
           	}
        }
    }
   	ast(tokens){
    	let stream = new LanguageTree(this,tokens);
        while(!stream.isEnd()){
        	this.parseChunk(stream);
            stream.next();
        }
        return stream;
    }
    //{{ Interpret Method }}\\
    interpretMethod(type,callback){
    	this._astInterpreters[type]=callback;
    }
    interpret(tree,parent,astr){
    	if(tree instanceof LanguageASTNode){
        	let reader = this._getAstInterpreter(tree);
            if (reader){
            	if(parent){
                	tree.mainstream=parent;
                }
            	let r = reader(tree.mainstream,tree);
                if(tree.mainstream){
                	tree.mainstream.write("_res",r);
                }
            	return r;
            }
            if(parent){
            	parent.write("_res",undefined);
            }
            return
        }else if(!(tree instanceof LanguageASTBlock)){
        	if(parent){
            	parent.write("_res",tree);
            }
        	return tree;
        }
    	let stream = new LanguageReader(this,tree._tree);
        if(!parent&&astr){
        	if(l.globals){
            	for(let k in l.globals){
                	let v = l.globals[k];
                    astr.vars[k]=v;
                }
            }
        	stream.vars=astr.vars;
            stream.rawvars=astr.rawvars;
        }else{
        	stream.vars=tree.vars;
            stream.rawvars=tree.rawvars;
        }
        stream.parent = parent;
        tree.mainstream = stream;
        while(!stream.isEnd()){
        	let t = stream.token();
            let reader = this._getAstInterpreter(t);
            if(reader&&t){
            	t.mainstream=stream;
                t.vars=stream.vars;
                t.rawvars=stream.rawvars;
            	let r = reader(stream,t);
                if (r instanceof LanguageReader){
                	r = r.read("_res");
               	}
                stream.write("_res",r);
            }else if(t instanceof LanguageASTBlock){
            	let r = this.interpret(t,stream);
                stream.write("_res",r.read("_res"));
            }else{
            	stream.write("_res",t);
            }
        	stream.next();
        }
        return stream;
    }
}

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
    Language.token("inc","++",l.types.Operator),
    Language.token("deinc","--",l.types.Operator),
    
    Language.token("eqs","==",l.types.Operator),
    Language.token("geq",">=",l.types.Operator),
    Language.token("leq","<=",l.types.Operator),
    Language.token("gt",">",l.types.Operator),
    Language.token("lt","<",l.types.Operator),
    Language.token("not","!",l.types.Operator),
    Language.token("neq","!=",l.types.Operator),
    Language.token("and","&",l.types.Operator),
    Language.token("or","|",l.types.Operator),
    Language.token("len","#",l.types.Operator),
    
    //{{ Keyword Tokens }}\\
    Language.token("func","fn",l.types.Keyword),
    Language.token("each","each",l.types.Keyword),
	Language.token("newvar","new",l.types.Keyword),
    Language.token("loop","loop",l.types.Keyword),
   	Language.token("iterate","iterate",l.types.Keyword)
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
        	let pn = tokens[p-1];
            if(pn&&pn.type=="Identifier"){
            	p++;
                nt.push(t);
                continue;
            }
        	p++;
            let nn = tokens[p];
            if(!nn||isNaN(nn.value)||nn.type!="Identifier"){
            	nt.push(t);
            	continue;
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
    "dot":{
    	priority:18.75,
        call:(stream,value,p)=>{
        	stream.next(2);
            let v = stream.token();
            l.typeTest(v,l.types.Identifier);
            v = v.value;
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
    	priority:19.9,
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
    	priority:19.9,
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
    	priority:19.9,
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
    	priority:19.9,
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
    	priority:19.9,
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
    	priority:19.9,
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
    	priority:19.8,
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
    	priority:19.8,
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
    "inc":{
    	priority:110,
        call:(stream,value,p)=>{
        	stream.next();
        	let result = stream.astNode();
            result.type="inc";
            result.write("v1",value);
            return l.exp(result,-1);
        },
    },
    "deinc":{
    	priority:110,
        call:(stream,value,p)=>{
        	stream.next();
        	let result = stream.astNode();
            result.type="deinc";
            result.write("v1",value);
            return l.exp(result,-1);
        },
    },
}
l.parseComplexExpression = function(stream,value){
	if(!(value instanceof Expression)){
    	return value;
    }
    let n = stream.getNext();
    let vp = value.priority;
    if(!n){return value.value}
    for(let k in l.complexExps){
    	let v = l.complexExps[k];
        if(!l.eq(n,l.getToken(k))){continue}
        if(value.priority<=v.priority){
        	value = v.call(stream,value.value,v.priority);
            value.priority = vp;
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
        stream.next();
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
                let v = l.parseExpression(stream,stream.token());
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
            let vargs = {};
            let close = l.getToken("pclose");
            let comma = l.getToken("comma");
            while(!stream.isEnd()&&!l.eq(stream.token(),close)){
            	let t = stream.token();
                if(l.eq(t,close)){throw new Error("Unexpected )")}
                let varg=false;
                if(l.eq(t,l.getToken("mul"))){
                	stream.next();
                   	t=stream.token();
                    varg=true;
                }
                l.typeTest(t,l.types.Identifier);
                if(!l.isIdentifierString(t.value)){
                	throw new Error(`Unexpected parameter name ${t.value}`);
                }
                params.push(t.value);
                if(varg){
                	vargs[t.value]=true;
                }
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
            fn.write("vargs",vargs);
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
        }else if(l.eq(token,l.getToken("iterate"))){
        	stream.next();
            let b = stream.astNode();
            b.type = "iterate";
            let iter = l.parseExpression(stream,stream.token(),undefined,true);
            b.write("iter",iter);
            stream.next();
            let vars = l.identifierList(stream);
            stream.next();
            let body = l.codeBlock(stream,stream.token());
            b.write("vars",vars);
            b.write("body",body);
            return b;
        }else if(l.eq(token,l.getToken("loop"))){
        	stream.next();
            let b = stream.astNode();
            b.type = "loop";
            let iter = l.parseExpression(stream,stream.token(),undefined,true);
            b.write("amount",iter);
            stream.next();
            let body = l.codeBlock(stream,stream.token());
            b.write("body",body);
            return b;
        }else if(l.eq(token,l.getToken("newvar"))){
        	stream.next();
            let vn = stream.token();
            if (vn.type!="Identifier"){
            	throw new Error(`Expected Identifier, got ${vn.type} instead!`);
            }
            l.testNext(stream,l.getToken("eq"));
            stream.next(2);
            let v = l.parseExpression(stream,stream.token());
            let b = stream.astNode();
            b.type="newvar";
            b.write("name",vn.value);
            b.write("value",v);
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
    }else if(token.type==l.types.Constant){
    	result = token.value;
    }else if(l.eq(token,l.getToken("len"))){
    	let r = stream.astNode();
        r.type = "len";
        stream.next();
        r.write("v1",l.parseExpression(stream,stream.token(),73,true));
        result = r;
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
l.interpretMethod("newvar",(stream,token)=>{
	token=token||stream.token();
  	let v = l.interpret(token.read("value"),stream);
    stream.rawvars[token.read("name")]=v;
    return v;
});
l.interpretMethod("func",(stream,token)=>{
	token=token||stream.token();
    let params = token.read("params");
    let body = token.read("body");
    let vargs = token.read("vargs");
    return function(...a){
    	let poff = 0;
    	for(let k in params){
        	let v = params[k];
            let av = a[poff];
            if(vargs[v]){
            	av=[];
            	let argoff = (params.length-1)-(+k);
                for(let i=+k;i<=(a.length-1)-argoff;i++){
                	av.push(a[i]);
                    poff++;
                }
            }else{
            	poff++;
            }
            body.rawvars[v]=av;
        }
        let r = l.interpret(body,stream);
        return r.read("_res");
    }
});
l.interpretMethod("commaexp",(stream,token)=>{
	token=token||stream.token();
    let r = l.interpret(token,stream).read("_res");
    console.log(r);
    return r
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
    if(typeof v2=="number"){
    	v2--;
    }
    return v1[v2];
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
    if(typeof i=="number"){
    	i--;
    }
    o[i]=v2;
    return o[i];
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
    return 0;
});
l.interpretMethod("or",(stream,t)=>{
	t = t||stream.token();
    let v1 = l.interpret(t.read("v1"),stream);
    if(v1){
    	return v1;
    }else{
    	let v2 = l.interpret(t.read("v2"),stream);
        if(v2){
        	return v2;
        }
    	return v1||v2;
    }
});
l.interpretMethod("each",(stream,t)=>{
	t=t||stream.token();
    let iter = l.interpret(t.read("iter"),stream);
    let vars = t.read("vars");
    let body = t.read("body");
    for(let i=0;i<=iter.length-1;i++){
    	let vs=[i+1,iter[i]];
        for(let k in vs){
            body.rawvars[vars[k]]=vs[k];
        }
        l.interpret(body,stream);
    }
});
l.interpretMethod("iterate",(stream,t)=>{
	t=t||stream.token();
    let iter = l.interpret(t.read("iter"),stream);
    let vars = t.read("vars");
    let body = t.read("body");
    for(let _k in iter){
    	let _v = iter[_k];
        let vs=[_k,_v];
       	for(let k in vs){
        	body.rawvars[vars[k]]=vs[k];
        }
        l.interpret(body,stream);
    }
});
l.interpretMethod("loop",(stream,t)=>{
	t=t||stream.token();
    let o = l.interpret(t.read("amount"),stream);
    let body = t.read("body");
    for(let i=1;i<=o;i++){
        l.interpret(body,stream);
    }
});

Math.nround=function(x,y=0){
	let m = 10**y;
    return Math.floor(x*m+0.5)/m;
}

l.newTokens(
	Language.token("row","row",l.types.Keyword),
    Language.token("col","col",l.types.Keyword),
);
l.dataState = function(stream,token){
	let close = l.getToken("bclose"),
    	col = l.getToken("col"),
        row = l.getToken("row"),
        open = l.getToken("bopen");
    if(l.eq(token,col)){
    	stream.next();
    	let t = stream.token();
        l.typeTest(t,l.types.Identifier);
    	let r = {
        	data:[],
            type:"col",
            name:t.value,
        };
        if(l.checkNext(stream,open)){
        	stream.next(2);
        	while(!stream.isEnd()&&!l.eq(stream.token(),close)){
        		r.data.push(l.dataState(stream,stream.token()));
        		stream.next();
        	}
        }
        return r;
    }else if(l.eq(token,row)){
    	stream.next();
    	let t = stream.token();
        l.typeTest(t,l.types.Identifier);
    	let r = {
            type:"row",
            name:t.value,
        };
        if (l.checkNext(stream,l.getToken("eq"))){
        	stream.next(2);
            r.value = l.parseExpression(stream,stream.token());
        }
        return r;
    }
}

l.__apply=function(s,o,r){
	for(let k in r){
    	let v = r[k];
        if(v.type=="col"){
        	o[v.name]={};
        	l.__apply(o[v.name],v.data);
        }else if(v.type=="row"){
        	o[v.name]=l.interpret(v.value,s);
        }
    }
}

class DataSet {
	constructor(data,s){
    	l.__apply(s,this,data);
        return Object.preventExtensions(this);
    }
}

l.newState({
	token:Language.token("data","data",l.types.Keyword),
    ast:stream=>{
    	stream.next();
        let r = stream.astNode();
        r.type="data";
    	let t = stream.token();
        l.typeTest(t,l.types.Identifier);
        r.write("name",t.value);
        l.testNext(stream,l.getToken("bopen"));
        stream.next(2);
        let close = l.getToken("bclose");
        let data = [];
        while(!stream.isEnd()&&!l.eq(stream.token(),close)){
        	let t = stream.token();
            data.push(l.dataState(stream,t));
            if(l.eq(stream.getNext(),l.getToken("lineend"))){
    			stream.next();
    		}
            stream.next();
        }
        r.write("data",data);
        stream.write(r);
    },
    interpret:{
        callback:(stream,t)=>{
        	t=t||stream.token();
            let ds = new DataSet(t.read("data"),stream);
            stream.rawvars[t.read("name")]=ds;
            return ds;
        },
        type:"data",
    },
});

l.newTypes("String","Control","Constant");
l.newToken(Language.token("backslash","\\",l.types.Control));
l.setEscapeToken(l.getToken("backslash"));
l.newState({
	token:Language.token("string","\"",l.types.String),
    tokenize:stream=>{
    	let between = stream.between({
        	start:l.getToken("string"),
            end:l.getToken("string"),
            allowEscape:true,
            appendCaptures:false,
        });
        let result = "";
        for(let v of between){
        	result += v.rawValue;
        }
        stream.setValue(result);
        stream.setType(l.types.Constant);
    },
});
l.interpretMethod("len",(stream,t)=>{
	t=t||stream.token();
    let v = l.interpret(t.read("v1"),stream);
    return v.length;
});
l.interpretMethod("inc",(stream,t)=>{
	t=t||stream.token();
   	let v1 = t.read("v1");
    if(!["index","getvar"].includes(v1.type)){
    	console.log(v1);
    	throw new Error(`You can only increment variables or indexes in lists!`);
    }
    if(v1.type=="index"){
    	let o = l.interpret(v1.read("v1"),stream);
        let i = l.interpret(v1.read("v2"),stream);
        if(typeof i=="number"){
        	i--;
        }
        o[i]++;
        return o[i];
    }else if(v1.type=="getvar"){
    	let n = v1.read("name");
    	stream.vars[n]++
        return stream.vars[n];
    }
});
l.interpretMethod("deinc",(stream,t)=>{
	t=t||stream.token();
   	let v1 = t.read("v1");
    if(!["index","getvar"].includes(v1.type)){
    	console.log(v1);
    	throw new Error(`You can only increment variables or indexes in lists!`);
    }
    if(v1.type=="index"){
    	let o = l.interpret(v1.read("v1"),stream);
        let i = l.interpret(v1.read("v2"),stream);
        if(typeof i=="number"){
        	i--;
        }
        o[i]--;
        return o[i];
    }else if(v1.type=="getvar"){
    	let n = v1.read("name");
    	stream.vars[n]--;
        return stream.vars[n];
    }
});

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
    valuelog:function(v,...a){
    	document.write(`${v}: ${a.join(" ")}<br>`);
    },
    sqrt:Math.sqrt,
    root:function(a,b=2){
    	return a**(1/b);
    },
    time:function(){
    	return Date.now()/1000;
    },
    pi:Math.PI,
    e:Math.E,
};

let t = l.tokenize(`
x = [2]
log(x[1]);
x[1]++;
`);
let a = l.ast(t);
let i = l.interpret(a._result,undefined,a);
let r = i.read("_res");
if(r!=undefined){
	document.write(r);
}

//{{ Examples }}\\

/*
f = fn(x)
	2*(x^2)+x
fp = f';
xr = 1..3;
each xr _,v
	log(f(v),fp(v));

add=fn(*a)(new r=0),(each a k,v(r=r+v)),r
add(1,2,3);

t=0.5;
n=0;
m=10;
(1-t)*n+t*m;

const l = new Language("Test Language");
l.newTypes("String","Control","Whitespace","Constant","Identifier");
l.newTokens(
	Language.token("space"," ",l.types.Whitespace),
    Language.token("backslash","\\",l.types.Identifier),
    Language.token("true","true",l.types.Identifier),
    Language.token("false","false",l.types.Identifier),
);
l.setEscapeToken(l.getToken("backslash"));
l.setTokenizerFinish((stream,tokens)=>{
	return tokens.filter(x=>x.type!=l.types.Whitespace);
});
l.newState({
	token:Language.token("string","\"",l.types.String),
    tokenize:stream=>{
    	let between = stream.between({
        	start:l.getToken("string"),
            end:l.getToken("string"),
            allowEscape:true,
            appendCaptures:false,
        });
        let result = "";
        for(let v of between){
        	result += v.rawValue;
        }
        stream.setValue(result);
        stream.setType(l.types.Constant);
    },
});
l.newState({
	tokens:[l.getToken("true"),l.getToken("false")],
    tokenize:stream=>{
    	let t = stream.token();
        let result = stream.eq(t,l.getToken("true"));
    	stream.setValue(result);
        stream.setType(l.types.Constant);
    },
    ast:stream=>{
    	let token = stream.token();
        stream.openChunk();
        stream.write(token.value);
        stream.setType("bool");
        stream.closeChunk();
    },
    interpret:{
    	callback:stream=>{
    		let token = stream.token();
            document.write(token);
    	},
        type:"bool",
    }
});

let t = l.tokenize(`true`);
let a = l.ast(t);
let i = l.interpret(a);
*/
