import Object from "./object";

class Character extends Object {
    constructor(pixelArr, background, name, layer, hp, mana, agility, range, damage, armor, animations) {
        super(pixelArr, background, name, layer); // Вызов конструктора базового класса Object
        this.maxHp = 700;
        this.hp = hp;
        this.maxMana = mana;
        this.mana = mana;
        this.maxAgility = agility;
        this.agility = agility;
        this.maxRange = range;
        this.range = range;
        this.defaultDamage = damage;
        this.damage = damage;
        this.maxArmor = 5;
        this.armor = armor;
        this.animations = animations
    }

    takeDamage(amount) {
        const damageTaken = Math.max(amount - this.armor, 0);
        this.hp = Math.max(this.hp - damageTaken, 0);
        return this.hp;
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp); // Добавляем проверку на максимальное значение здоровья
    }

    useMana(amount) {
        if (this.mana >= amount) {
            this.mana -= amount;
            return true;
        }
        return false;
    }

    gainMana(amount) {
        this.mana = Math.min(this.mana + amount, this.maxMana); // Добавляем проверку на максимальное значение маны
    }

    attack(target) {
        target.takeDamage(this.damage);
    }
}

export default Character;