/*
Programmed by FIREYAUTO

This is a library that makes it easier to create a programming language written in js.
There is currently no documentation.
*/

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
        this._result = new LanguageASTBlock(this);
        this._position=0;
        this._cToken = Tokens[0];
        this._chunks = [];
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
        this._chunk = new LanguageASTBlock(this);
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
    	return new LanguageASTNode(this);
    }
    astBlock(){
    	return new LanguageASTBlock(this);
    }
    isEnd(){
    	return this._position>this._rawTokens.length-1;
    }
    token(){
    	return this._cToken;
    }
}

class LanguageAST {
	constructor(type,parent){
        this._type = type;
        this.stream = parent;
        this._readInners = false;
        this._innerNames = [];
        this.type = "ast";
        this.interpret = undefined;
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
    let res = [];
    for(let v of e){
    	res.push(`${v[0]}: ${v[1]}`);
    }
    return res.join(", ");
}

class LanguageASTBlock extends LanguageAST {
	constructor(p){
    	super("LanguageASTBlock",p);
    	this._tree = [];
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
	constructor(p){
    	super("LanguageASTNode",p);
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
    	return x.replace(/(\<|\>|\*|\(|\)|\{|\}|\[|\]|\||\=|\?|\&|\^|\$|\\|\-|\+)/g,"\\$&");
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
        return stream._result;
    }
    //{{ Interpret Method }}\\
    interpretMethod(type,callback){
    	this._astInterpreters[type]=callback;
    }
    interpret(tree,parent){
    	if(tree instanceof LanguageASTNode){
        	let reader = this._getAstInterpreter(tree);
            if (reader){
            	return reader(tree.stream,tree);
            }
            return
        }else if(!(tree instanceof LanguageASTBlock)){
        	return tree;
        }
    	let stream = new LanguageReader(this,tree._tree);
        stream.parent = parent;
        while(!stream.isEnd()){
        	let t = stream.token();
            let reader = this._getAstInterpreter(t);
            if(reader){
            	reader(stream,t);
            }else if(t instanceof LanguageASTBlock){
            	this.interpret(t,stream);
            }
        	stream.next();
        }
        return stream._result;
    }
}
