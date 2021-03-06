// Helpers
function isPositive(number) {
  return typeof number === "number" && number >= 0;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}
//

class User {
  constructor(name, money) {
    if (isPositive(money)) {
      this.name  = name;
      this.money = money;
      // Якщо ми плануємо напряму задавати кількість грошей, то тут можна зробити захищені свойства замість публічних, і зробити сеттер, щоб кількість грошей ніколи не була менше за нуль.
    } else {
      throw new Error("Кількість грошей не може бути від'ємною!");
    }
  }

  play(casinoName, money) {
    const casino = casinosStorage[casinoName];
    
    if (!casino) {
      return console.error("Казино з такою назвою не існує!");
    }
    
    if (this.money < money) {
      return console.error("У вас недостатньо грошей для гри!");
    }

    const selectedMachine      = casino.machines.find(machine => money * 3 <= machine.getMoney); // money*3 - Перевіряєм чи хватить грошей на максимальний куш.
    const selectedMachineIndex = casino.machines.indexOf(selectedMachine);

    if (!selectedMachine) {
      return console.log("Немає жодного робочого автомата (закінчились гроші), спробуйте зробити меншу ставку!")
    }

    console.info(`Ви граєте за автоматом №${selectedMachineIndex} в казино ${casinoName}!`);
    
    this.money -= money;

    const wonMoney = selectedMachine.play(money);

    if (wonMoney > 0) {
      this.money += wonMoney;
    }

  }
}

class SuperAdmin extends User {
  constructor(name, money) {
    super(name, money);

    this.casinos = {};
  }

  createCasino(name) {
    if (Object.keys(casinosStorage).includes(name)) {
      return console.error("Казино з такою назвою вже існує!")
    }

    return this.casinos[name] = casinosStorage[name] = new Casino(name);
  }

  createMachine(casinoName, initialMoney) {
    const casino = this.casinos[casinoName];

    if (!casino) {
      return console.error(`У Адміна ${this.name} Казино з такою назвою не існує!`);
    }

    if (!isPositive(initialMoney)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете покласти в автомат, менше нуля!`);
    }

    if (initialMoney > this.money) {
      return console.error("Введена сумма перевищує Вашу кількість грошей!");
    }

    this.money -= initialMoney;
    
    casino.addGameMachine(initialMoney);
  }

  removeMachine(casinoName, machineIndex) {
    const casino = this.casinos[casinoName];

    if (!casino) {
      return console.error(`У Адміна ${this.name} Казино з такою назвою не існує!`);
    }

    if (!casino.machines[machineIndex]) {
      return console.error(`Автомату з індексом ${machineIndex} не існує!`); 
    }

    const removedMachine = casino.removeGameMachine(machineIndex)[0];

    this.money += removedMachine.getMoney;
    this.putMoneyInCasino(casinoName, removedMachine.getMoney);

    console.log(`Автомат з індексом ${machineIndex} було видалено, і його гроші (${removedMachine.getMoney}), були розприділені між усіма автоматами.`)
    
  }

  takeMoneyFromCasino(casinoName, number) {
    const casino = this.casinos[casinoName];
    
    if (!casino) {
      return console.error(`У Адміна ${this.name} Казино з такою назвою не існує!`);
    }

    if (!isPositive(number)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете взяти менше нуля!`);
    }

    if (casino.getMoney < number) {
      return console.error(`В казино ${casinoName} недостатньо коштів! Не вистачає ${number - casino.getMoney}!`)
    }

    const sortedMachines = casino.machines.slice().sort((a, b) => b.getMoney - a.getMoney);
    // Використовую slice для того щоб зробити копію массиву, тому що sort буде міняти порядок і в оригінальному массиві.
    // Якшо це станеться, то автомати поміняють свій порядок.
    
    let collectedMoney = 0;

    for (const machine of sortedMachines) {
      if (collectedMoney >= number) break;  // ">=" замість "===" на випадок втрати точності, але наврядчи вона тут буде

      const collectedMoneyFromMachine = Math.min(machine.getMoney, number - collectedMoney);
      // Якщо в автоматі багато грошей, але нам потрібно взяти тільки частину

      machine.takeMoney(collectedMoneyFromMachine);
      collectedMoney += collectedMoneyFromMachine;
    }

    this.money += collectedMoney;
    
    console.log(`Ви успішно зняли з рахунку казино ${collectedMoney}!`);
    console.log("");

    return collectedMoney;
  }

  putMoneyInCasino(casinoName, number) {
    // В таску не було вказано як саме покласти гроші на рахунок казино, тому я їх розприділив порівну між усіма автоматами в казино (принцип як при видаленні автомата)
    const casino = this.casinos[casinoName];

    if (!casino) {
      return console.error(`У Адміна ${this.name} Казино з такою назвою не існує!`);
    }

    if (!isPositive(number)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете покласти менше нуля!`)
    }

    if (this.money < number) {
      return console.error("Помилка! Кількість грошей, які ви хочете покласти перевищує кількість грошей на вашому рахунку!")  
    }

    const moneyForMachine = number / casino.machineCount;

    for (const machine of casino.machines) {
      machine.putMoney(moneyForMachine);
    }
        
    this.money -= number;
  }

  putMoneyInMachine(casinoName, machineIndex, number) {
    const casino = this.casinos[casinoName];

    if (!casino) {
      return console.error(`У Адміна ${this.name} Казино з такою назвою не існує!`)
    }
    
    if (!casino.machines[machineIndex]) {
      return console.error(`Помилка! Автомат з індексом №${machineIndex} не існує!`)
    }

    if (!isPositive(number)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете покласти в автомат, менше нуля!`)
    }

    if (this.money < number) {
      return console.error("Помилка! Кількість грошей, які ви хочете покласти в автомат перевищує кількість грошей на вашому рахунку!")
    }

    this.money -= number;
    
    return casino.machines[machineIndex].putMoney(number);
  }
}

class GameMachine {
  constructor(money) {
    if (isPositive(money)) {
      this._money = money;
    } else {
      throw new Error("Кількість грошей не може бути від'ємною!");
    }
  }

  takeMoney(number) {
    if (!isPositive(number)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете взяти з автомату, менше нуля!`)
    }

    if (this._money < number) {
      return console.error(`В автоматі недостатньо коштів! Не вистачає ${number - this._money}!`)
    }

    this._money -= number;
    console.log(`З GameMachine було знято ${number}! Залишок ${this._money}!`)
  }

  putMoney(number) {
    if (!isPositive(number)) {
      return console.error(`Помилка! Кількість грошей, які ви хочете покласти менше нуля!`);
    }

    this._money += number;
    console.log(`Успішно покладено ${number} грошей в GameMachine! Баланс ${this._money}`);
  }

  play(number) {
    this.putMoney(number);

    const randomNumber  = getRandomInt(100, 1000).toString();
    const uniqueNumbers = new Set([...randomNumber]);

    let wonMoney = 0;

    console.log(`Випало число: ${randomNumber}`);

    switch (uniqueNumbers.size) {
      case 1: // 3 однакові (куш)
        wonMoney += number * 3;
        break;

      case 2: // 2 однакові
        wonMoney += number * 2;
        break;
    
      default:
        console.log(`Ви програли: ${number}!`)
        break;
    }

    if (wonMoney > 0) {
      console.log(`Ваш виграш: ${wonMoney}!`)
      this.takeMoney(wonMoney)
    }
    
    console.log(""); // Пуста лінія (пропуск)

    return wonMoney
  }

  get getMoney() { 
    return this._money;
  }
}

class Casino {
  constructor(name) {
    this.name = name;
    this._machines = [];
  }
  
  addGameMachine(initialMoney) {
    this._machines.push(new GameMachine(initialMoney)); 
  }

  removeGameMachine(machineIndex) {
    if (!this._machines[machineIndex]) {
      return console.error(`Автомату з індексом ${machineIndex} не існує!`);
    }

    return this._machines.splice(machineIndex, 1);
  }

  get getMoney() {
    return this._machines.reduce((sum, machine) => sum + machine.getMoney, 0);
  }

  get machineCount() {
    return this._machines.length;
  }

  get machines() {
    return this._machines;
  }
}

const casinosStorage = {};

// Створюємо адмінів, юзерів, і казино!
const userJohn    = new User("John", 7000);
const adminAndrew = new SuperAdmin("Andrew", 30000);
const adminMike   = new SuperAdmin("Mike", 22000);

const dragonCasino = adminAndrew.createCasino("Dragon's");
const triadaCasino = adminMike.createCasino("Triada's");
// const triadaCasino1 = adminMike.createCasino("Triada's"); // Помилка казино з такою назвою вже існує!

adminAndrew.createMachine("Dragon's", 3000);
adminAndrew.createMachine("Dragon's", 4000);
adminAndrew.createMachine("Dragon's", 1200);

adminMike.createMachine("Triada's", 5500);
adminMike.createMachine("Triada's", 14500);

adminAndrew.takeMoneyFromCasino("Dragon's",5000)

userJohn.play("Dragon's", 100)
userJohn.play("Dragon's", 1050)
userJohn.play("Triada's", 1550)

// adminAndrew.putMoneyInCasino("Dragon's", 22500)

// adminAndrew.removeMachine("Triada's", 1) // У Адміна Andrew Казино з такою назвою не існує!

console.log(adminAndrew)
console.log(adminMike)
console.log("")
console.log(userJohn)
console.log("")
console.log(casinosStorage)