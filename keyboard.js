class KeyboardShortcuts {
    constructor() {
        console.log(JSON.stringify(this.generateShortcuts('move', 9)));
        console.log('');
        console.log(JSON.stringify(this.generateShortcuts('stack', 9)));
    }
    generateShortcuts(type, count) {
        const result = [];
        for (var index = 1; index < count + 1; index++) {
            let shortcut;
            switch (type) {
                case 'move':
                    shortcut = this.generateMoveShortcut(index);
                    break;
                case 'stack':
                    shortcut = this.generateStackShortcut(index);
                    break;
            }
            result.push(shortcut);
        }
        return result;
    }
    generateMoveShortcut(index) {
        return {
            // Macro keybinding
            keyName: `key.keyboard.keypad.${index}`,
            // Key modifier
            keyModName: 'key.keyboard.right.win',
            // Command to execute
            command: `//move ${index}`,
            // Type of Macro. Delayed, Repeating, RunNTimes, SingleUse, DisplayOnly
            macroType: 'SingleUse',
        };
    }
    generateStackShortcut(index) {
        return {
            // Macro keybinding
            keyName: `key.keyboard.keypad.${index}`,
            // Key modifier
            keyModName: 'key.keyboard.right.alt',
            // Command to execute
            command: `//stack ${index}`,
            // Type of Macro. Delayed, Repeating, RunNTimes, SingleUse, DisplayOnly
            macroType: 'SingleUse',
        };
    }
}

const keyboard = new KeyboardShortcuts();
console.log('');
console.log(Math.floor(164 / 64), ' Stacks ', 164 % 64, ' Items');
