'use strict'

const libraries = require('../libraries')
const {args_events, terminal_log} = require('./events')
const path = require('path')
const fs = require('fs')

class dynamite{
    constructor(args, config){
        this.args = args
        this.libraries = libraries
        this.console = terminal_log
        this.parse_args = args_events
        this.file = path.basename(__filename)
        this.config = config
        this.help_alias = ['help', '-h', 'h', '-help']
        this.help_path = path.join(__dirname, './help.txt')
        this.logger = new logger(this.config)
    }

    parse_arguments(){
        let specified_args = this.args.splice(2)
        for (let index=0; index < specified_args.length; index+=2){
            let identifier = specified_args[index].split('-')[1] // -p
            let value = specified_args[index+1] // true

            if(this.help_alias.includes(specified_args[index])){
                let content = this.get_help_file()
                this.logger.help(content)
                process.exit()
            }
    
            else{
                this.parse_args.emit(identifier, value, this.config)
            }
        }

        this.logger.update_configuration(this.config)
    }

    get_help_file(){
        return fs.readFileSync(this.help_path, 'utf8')
    }

    handle_arguments(){
        if(this.args.length % 2 === 0 || this.help_alias.includes(this.args[2])){
            if(this.args.length <= 2){
                return {}
            }
            else{
                return this.parse_arguments()
            }
        }
        else{
            this.error(this.file, 'args_length') 
            process.exit()
        }
    }

    async setup_utils(){
        if(this.config.utils.database.on){
            const sequelize = this.libraries.sequelize
            let database = await new sequelize({
                host: this.config.utils.database.host,
                port: this.config.database_port,
                username: this.config.utils.database.username,
                password: this.config.utils.database.password,
                database: this.config.utils.database.name,
                dialect: this.config.utils.database.dialect,
                logging: false,
                define: {
                    timestamps: false,
                    freezeTableName: true
                }
            })
            try{
                await database.authenticate()
                for(let table in this.config.tables){
                    if(typeof this.config.tables[table] === 'string' && this.config.tables[table] !== ''){
                        if (fs.existsSync(path.join(String(this.config.tables[table])))) {
                            this[table] = database.import(this.config.tables[table])
                        }
                    }
                }
            }
            catch(e){
                this.logger.warn(e)
                this.error(this.file, 'database') 
            }
        }

        if(this.config.utils.nodemailer.on){
            this.transporter = this.libraries.nodemailer.createTransport({ 
                host: this.config.utils.nodemailer.host,
                port: this.config.utils.nodemailer.port,
                secure: this.config.utils.nodemailer.secure,
                auth: {
                     user: this.config.utils.nodemailer.username,
                     pass: this.config.utils.nodemailer.password,
                } 
            })

            this.transporter_reset = this.libraries.nodemailer.createTransport({ 
                host: this.config.utils.nodemailer.host,
                port: this.config.utils.nodemailer.port,
                secure: this.config.utils.nodemailer.secure,
                auth: {
                     user: 'reset@cpreimagined.com',
                     pass: 'rvn68xP4wTmQVBuZ5K6Q59h2vVGWZh3S8G8PfvPg2cDGWiuh3GfAYnvsuhshntkL',
                } 
            })
        }

        if(this.config.utils.webhooks.on){
            this.panel_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.panel_url)
            this.register_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.register_url)
            this.ban_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.ban_url)
            this.unban_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.unban_url)
            this.verify_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.verify_url)
            this.ipban_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.ipban_url)
            this.item_hook = new this.libraries.webhook.Webhook(this.config.utils.webhooks.item_url)
        }

        else{
            return
        }
    }

    error(file, error_type=null){
        let message = {content: ''}
        if(!error_type){
            this.console.emit('error', message)
            this.logger.crash(message.content)
        }
        else{
            this.console.emit(error_type, message)
            this.logger.crash(message.content)
        }
        let error = new Error()
        this.handle_error(error, file)
    }

    handle_error(error, file){
        if(this.config.debugger){
            let frame = error.stack.split("\n")[2]
            let line_number = frame.split(":")[1]
            let func = frame.split(" ")[5]
            let func_name = func.split('.')[1]

            if(func_name === '<anonymous>'){
                let debug_message = `Error caught in the file ${__dirname}/${file} on line ${line_number}.`
                this.logger.crash(debug_message)
            }

            else if(!func_name){
                let debug_message = `Error caught in the file ${__dirname}/${file} on line ${line_number} with the function ${func}.`
                this.logger.crash(debug_message)
            }
        
            else{
                let debug_message = `Error caught in the file ${__dirname}/${file} on line ${line_number} with the function ${func_name}.`
                this.logger.crash(debug_message)
            }
        }
    }

    get_ip(request){
        return (request.headers["X-Forwarded-For"] || request.headers["x-forwarded-for"] || '').split(',')[0] || request.client.remoteAddress
    }
}

class logger{
    constructor(config){
        this.config = config
        this.log_dir = path.join(__dirname, '../logs')
        this.panel_log_dir = path.join(__dirname, '../logs/panel')
        this.log_path = path.join(__dirname, '../logs/website.log')
        this.player_log_path = path.join(__dirname, '../logs/panel/player.log')
        this.mod_log_path = path.join(__dirname, '../logs/panel/mod.log')
        this.admin_log_path = path.join(__dirname, '../logs/panel/admin.log')
        this.logs_setup = false
        this.player_logs_setup = false
        this.mod_logs_setup = false
        this.admin_logs_setup = false
        this.effects = {
            bright: 1,
            dim: 2, 
            underline: 4,
            flash: 5
        }
    }

    admin_log(message){
        if(this.config.file_log){
            if(!this.admin_logs_setup){
                this.setup_admin_logs()
            }
            const date = String(new Date())
            const log_message = `${date}: ${message} \n`
            fs.appendFileSync(this.admin_log_path, log_message)
        }
    }

    setup_admin_logs(){
        if (!fs.existsSync(this.panel_log_dir)) {
            fs.mkdirSync(this.panel_log_dir)
        }

        if (!fs.existsSync(this.admin_log_path)) {
            fs.open(this.admin_log_path, 'w', (error, file) => {
                if(error){
                    this.crash(error)
                }
            })
        }
        
        this.admin_logs_setup = true
    }

    mod_log(message){
        if(this.config.file_log){
            if(!this.mod_logs_setup){
                this.setup_mod_logs()
            }
            const date = String(new Date())
            const log_message = `${date}: ${message} \n`
            fs.appendFileSync(this.mod_log_path, log_message)
        }
    }

    setup_mod_logs(){
        if (!fs.existsSync(this.panel_log_dir)) {
            fs.mkdirSync(this.panel_log_dir)
        }

        if (!fs.existsSync(this.mod_log_path)) {
            fs.open(this.mod_log_path, 'w', (error, file) => {
                if(error){
                    this.crash(error)
                }
            })
        }
        
        this.mod_logs_setup = true
    }

    player_log(message){
        if(this.config.file_log){
            if(!this.player_logs_setup){
                this.setup_player_logs()
            }
            const date = String(new Date())
            const log_message = `${date}: ${message} \n`
            fs.appendFileSync(this.player_log_path, log_message)
        }
    }

    setup_player_logs(){
        if (!fs.existsSync(this.panel_log_dir)) {
            fs.mkdirSync(this.panel_log_dir)
        }

        if (!fs.existsSync(this.player_log_path)) {
            fs.open(this.player_log_path, 'w', (error, file) => {
                if(error){
                    this.crash(error)
                }
            })
        }
        
        this.player_logs_setup = true
    }

    file_log(message){
        if(this.config.file_log){
            if(!this.logs_setup){
                this.setup_logs()
            }
            let date = String(new Date())
            let log_message = `${date}: ${message} \n`
            fs.appendFileSync(this.log_path, log_message)
        }
    }

    setup_logs(){
        if (!fs.existsSync(this.log_dir)) {
            fs.mkdirSync(this.log_dir)
        }

        if (!fs.existsSync(this.log_path)) {
            fs.open(this.log_path, 'w', (error, file) => {
                if(error){
                    this.crash(error)
                }
            })
        }
        
        this.logs_setup = true
    }

    update_configuration(config){
        this.config = config
    }

    success(data, effect = null){
        let message = '[SUCCESS] => '
        message+=data
        this.file_log(message)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[32m", message)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[32m", message)
    }

    warn(data, effect = null){
        let message = '[WARNING] => '
        message+=data
        this.file_log(message)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[33m", message)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[33m", message)
    }

    crash(data, effect = null){
        let message = '[CRASH] => '
        message+=data
        this.file_log(message)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[31m", message)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[31m", message)
    }

    help(data, effect = null){
        let message = '[HELP] => '
        message+=data
        if(!effect)
            return console.log("\x1b[0m", "\x1b[33m", message)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[33m", message)
    }

    black(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[30m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[30m", data)
    }

    red(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[31m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[31m", data)
    }

    green(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[32m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[32m", data)
    }

    yellow(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[33m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[33m", data)
    }

    blue(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[34m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[34m", data)
    }

    magenta(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[35m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[35m", data)
    }

    cyan(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[36m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[36m", data)
    }

    white(data, effect = null){
        this.file_log(data)
        if(!effect)
            return console.log("\x1b[0m", "\x1b[37m", data)
        console.log(`\x1b[${this.effects[effect]}m`, "\x1b[37m", data)
    }
}



module.exports = dynamite

