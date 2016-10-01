class Entity{
    constructor(entityjson){
        this._json = entityjson;
        this._position = this._json.position;
    }

    getPosition(){
        return this._position;
    }
}

module.exports = Entity;