class Entity{
    constructor(entity){
        this._entity   = entity;
    }

    getEntity(){
        return this._entity;
    }

    getId(){
        return this.getEntity().id;
    }

    getType(){
        return this.getEntity().type;
    }

    getMobType(){
        return this.getEntity().mobType;
    }

    getUsername(){
        return this.getEntity().username;
    }

    getDisplayName(){
        return this.getEntity().displayName;
    }

    getEntityType(){
        return this.getEntity().entityType;
    }

    getKind(){
        return this.getEntity().kind;
    }

    getObjectType(){
        return this.getEntity().objectType;
    }

    getCount(){
        return this.getEntity().count;
    }

    getPosition(){
        return this.getEntity().position;
    }

    getVelocity(){
        return this.getEntity().velocity;
    }

    getYaw(){
        return this.getEntity().yaw;
    }

    getPitch(){
        return this.getEntity().pitch;
    }

    getHeight(){
        return this.getEntity().height;
    }

    isOnGround(){
        return this.getEntity().onGround;
    }

    getEquipment(){
        return this.getEntity().equipment;
    }

    getHeldItem(){
        return this.getEquipment()[0];
    }

    getBoots(){
        return this.getEquipment()[1];
    }

    getLeggings(){
        return this.getEquipment()[2];
    }

    getChestplate(){
        return this.getEquipment()[3];
    }

    getHelmet(){
        return this.getEquipment()[4];
    }

    getHealth(){
        return this.getEntity().health;
    }

    getFood(){
        return this.getEntity().food;
    }

    getPlayer(){
        return this.getEntity().player;
    }

    getMetadata(){
        return  this.getEntity().metadata;
    }

    toJSON(){
        return this.getEntity();
    }
}

module.exports = Entity;