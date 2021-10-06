/*

Storage Library JS

	Written by FIREYAUTO on 10/6/2021
	
	Info:
	
		">" - Section
		"?" - Description
		"*" - Extra Information
		"~" - Code Example
		"[C]" - Class
		"[CM]" - Class Method
		"[PM]" - Private Class Method
		"[P]" - Property
		"[PP]" - Private Property
	
	Documentation:
		
		> Classes
		
		[C] LocalStorage(<StorageName: String>)
		? Creates a new LocalStorage object
		* Extends the "Storage" class
		~ new LocalStorage("Test")
		
		[C] SessionStorage(<StorageName: String>) 
		? Creates a new SessionStorage object
		* Extends the "Storage" class
		~ new SessionStorage("Test")
		
		> Methods
		
		[PM] Storage.__GET_STORAGE()
		? Returns an Object containing the data in the storage
		* This is an internal function
		
		[PM] Storage.__SET_STORAGE(<Storage: Object>)
		? Sets the Object for the storage
		* This is an internal function
		
		[CM] Storage.GetItem(<Name: String>)
		? Returns an item in the storage
		~ Storage.GetItem("Test")
		
		[CM] Storage.GetItems()
		? Returns an Object with all of the data in the storage, basically just "Storage.__GET_STORAGE()"
		
		[CM] Storage.SetItem(<Name: String>,<Value: Any>)
		? Sets an item in the storage
		~ Storage.SetItem("Test","Hello, world!")
		
		[CM] Storage.RemoveItem(<Name: String>)
		? Removes an item from the storage
		~ Storage.RemoveItem("Test")
		
		[CM] Storage.Check(<Name: String>,<Callback: Function>)
		? Calls the "Callback" function with the item in the storage and returns the results.
		~ Storage.Check("Test",Item=>Item=="Hello, world!");
		
		[PP] Storage.__SO
		? The internal storage object that holds all storages
		
		[PP] Storage.__NAME
		? The internal name of the storage
		
*/

const __STORAGES = {
	__LOCAL:{},
	__SESSION:{},
};

class Storage {
	constructor(Name,StorageObject){
		this.__SO = StorageObject;
		this.__NAME = Name;
		if (StorageObject.getItem(Name)==undefined){
			StorageObject.setItem(Name,"{}");
		}
	}
	__GET_STORAGE(){
		return JSON.parse(this.__SO.getItem(this.__NAME));
	}
	__SET_STORAGE(Storage){
		this.__SO.setItem(this.__NAME,JSON.stringify(Storage));
	}
	GetItem(Name){
		let Storage = this.__GET_STORAGE();
		return Storage[Name];
	}
	GetItems(){
		return this.__GET_STORAGE();
	}
	SetItem(Name,Value){
		let Storage = this.__GET_STORAGE();
		Storage[Name]=Value;
		this.__SET_STORAGE(Storage);
	}
	RemoveItem(Name){
		let Storage = this.__GET_STORAGE();
		if (Storage.hasOwnProperty(Name)){
			delete Storage[Name];
			this.__SET_STORAGE(Storage);
		}
	}
	Check(Name,Callback){
		let Storage = this.__GET_STORAGE();
		if (Storage.hasOwnProperty(Name)&&Callback&&typeof Callback=="function"){
			return Callback(Storage[Name]);
		}
		return false;
	}
}

class LocalStorage extends Storage {
	constructor(Name){
		if (__STORAGES.__LOCAL.hasOwnProperty(Name)){
			return __STORAGES.__LOCAL[Name];
		}
		super(Name,window.localStorage);
		__STORAGES.__LOCAL[Name]=this;
	}
}

class SessionStorage extends Storage {
	constructor(Name){
		if (__STORAGES.__SESSION.hasOwnProperty(Name)){
			return __STORAGES.__SESSION[Name];
		}
		super(Name,window.sessionStorage);
		__STORAGES.__SESSION[Name]=this;
	}
}
