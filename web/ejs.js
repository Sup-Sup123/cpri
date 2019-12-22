'use strict'

const events = require('events')
const ejs_events = new events.EventEmitter()

ejs_events.on('create', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = ''
    ejs.site_key = web.site_key
})

ejs_events.on('reset', (ejs, web) => {
    ejs.success_message = 'Enter the username and email address that you registered your account with to reset your password.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('reset_captcha', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('email_not_found', (ejs, web, email) => {
    ejs.success_message = ''
    ejs.error_message = `This email address (${email}) was not found within our systems.`
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('reset_user_404', (ejs, web, username) => {
    ejs.success_message = ''
    ejs.error_message = `This username (${username}) was not found within our systems.`
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('reset_sent', (ejs, web, email) => {
    ejs.success_message = ''
    ejs.error_message = `A reset password link has been sent to ${email}. If you do not receive the email within 10 minutes, please try again or contact us at support@cpreimagined.com.`
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})


ejs_events.on('reset_expiry', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = `Sorry, this link is expired. Please try again on our reset password page.`
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('password_update_success', (ejs, web, user) => {
    ejs.success_message = `Congratulations ${user.Username}, you have successfully updated your password.`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('reset_404', (ejs, web, id) => {
    ejs.success_message = ''
    ejs.error_message = `This reset password link does not exist within our system. (You tried https://${web.domain}.com/reset/${id})`
    ejs.site_key = web.site_key
    ejs.feature = 'email_link'
})

ejs_events.on('set_password', (ejs, web, id) => {
    ejs.success_message = 'Choose a new password for your account.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = id
    ejs.feature = 'set_password'
})

ejs_events.on('register_captcha', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = web.site_key
})

ejs_events.on('username_taken', (ejs, web, username) => {
    ejs.success_message = ''
    ejs.error_message = `The username you put (${username}) is already registered within our systems.`
    ejs.site_key = web.site_key
})

ejs_events.on('email_taken', (ejs, web, email) => {
    ejs.success_message = ''
    ejs.error_message = `The email you put (${email}) is already registered within our systems.`
    ejs.site_key = web.site_key
})

ejs_events.on('registration_ip_spam', (ejs, web, ip) => {
    ejs.success_message = ''
    ejs.error_message = `Your IP address (${ip}) has been registered in our systems more than 3 times.`
    ejs.site_key = web.site_key
})

ejs_events.on('successful_registration', (ejs, web, username) => {
    ejs.success_message = `Congratulations, ${username} you have successfully registered. Please check your email address to activate your penguin!`
    ejs.error_message = ''
    ejs.site_key = web.site_key
})

ejs_events.on('activation_key_not_found', (ejs, web, key) =>{
    ejs.success_message = ''
    ejs.error_message = `The activation key given (${key}) was not found`
    ejs.site_key = web.site_key
})

ejs_events.on('login', (ejs, config) => {
    ejs.success_message = ''
    ejs.error_message = ''
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})


ejs_events.on('user_404', (ejs, config, username) => {
    ejs.success_message = ''
    ejs.error_message = `The username (${username}) does not exist within our systems.`
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})

ejs_events.on('incorrect_password', (ejs, config) => {
    ejs.success_message = ''
    ejs.error_message = `The password you entered is incorrect.`
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})

ejs_events.on('not_activated', (ejs, config) => {
    ejs.success_message = ''
    ejs.error_message = `Your account has not been activated yet, please check your email.`
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})

ejs_events.on('login_ip_spam', (ejs, config) => {
    ejs.success_message = ''
    ejs.error_message = `You have been banned from logging into any user account. Please contact support@cpreimagined.com or join our Discord to be unbanned. You can also reset your password at https://cpreimagined.com/reset`
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})


ejs_events.on('login_captcha', (ejs, config) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = config.web.site_key
    ejs.login = true
    ejs.reset = config.features.reset_password
})

ejs_events.on('not_logged_in', (ejs) => {
    ejs.loggedin = false
})

ejs_events.on('logged_in', (ejs, player) => {
    ejs.id = player.id
    ejs.username = player.username
    ejs.coins = player.coins
    ejs.loggedin = true
})

ejs_events.on('panel', (ejs, config, player) => {
    ejs.success_message = ''
    ejs.error_message = ''
    ejs.site_key = config.web.site_key
    ejs.login = false
    ejs.username = player.username
    ejs.id = player.id
    ejs.approval = player.approval
    ejs.active = player.active
    ejs.email = player.email
    ejs.coins = player.coins
    ejs.rank = player.rank
    ejs.add_item = player.handle_feature(config.features.add_item)
    ejs.redemption = player.handle_feature(config.features.redemption)
    ejs.unban = player.handle_feature(config.features.unban)
    ejs.change_email = player.handle_feature(config.features.change_email)
    ejs.change_password = player.handle_feature(config.features.change_password)
    ejs.verify_user = player.handle_feature(config.features.verify_user)
    ejs.ban = player.handle_feature(config.features.ban)
    ejs.manage_penguins = player.handle_feature(config.features.manage_penguins)
    ejs.logs = player.handle_feature(config.features.logs)
    ejs.add_items = player.handle_feature(config.features.add_items)
})

ejs_events.on('verify', (ejs, web, player) => {
    ejs.success_message = 'Verify a player.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.unverified_players = player.unverified_players
    ejs.moderator = player.moderator
    ejs.feature = 'verify'
})

ejs_events.on('add_clothing', (ejs, web, player, items) => {
    ejs.success_message = 'Add a clothing item.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_clothing'
    ejs.items = items
})

ejs_events.on('added_clothing', (ejs, web, player, items, id) => {
    ejs.success_message = `Successfully added the item ID ${id}.`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_clothing'
    ejs.items = items
})

ejs_events.on('items_added_exists', (ejs, web, player, items, id) => {
    ejs.success_message = ''
    ejs.error_message = `Item ID ${id} already exists in your inventory.`
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_clothing'
    ejs.items = items
})


ejs_events.on('item_not_exist', (ejs, web, player, items, id) => {
    ejs.success_message = ''
    ejs.error_message = `Item ID ${id} does not exist.`
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_clothing'
    ejs.items = items
})

ejs_events.on('add_furniture', (ejs, web, player, items) => {
    ejs.success_message = 'Add a furniture item.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_furniture'
    ejs.items = items
})

ejs_events.on('added_furniture', (ejs, web, player, items, id) => {
    ejs.success_message = `Successfully added furniture ID: ${id}.`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'add_furniture'
    ejs.items = items
})

ejs_events.on('unverified_user_404', (ejs, web, player, id) => {
    ejs.success_message = ''
    ejs.error_message = `The user with the ID ${id} was not found.`
    ejs.site_key = web.site_key
    ejs.unverified_players = player.unverified_players
    ejs.moderator = player.moderator
    ejs.feature = 'verify'
})

ejs_events.on('verify_successful', (ejs, web, player, username) => {
    ejs.success_message = ''
    ejs.error_message = `You have successfully verified the username ${username}.`
    ejs.site_key = web.site_key
    ejs.unverified_players = player.unverified_players
    ejs.moderator = player.moderator
    ejs.feature = 'verify'
})

ejs_events.on('unban', (ejs, web, player) => {
    ejs.success_message = 'Unban a player.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.bans = player.ban_data
    ejs.moderator = player.moderator
    ejs.feature = 'unban'
})

ejs_events.on('penguins_table', (ejs, web, player, penguins) => {
    ejs.success_message = 'Manage a player.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.penguin = penguins
    ejs.administrator = player.administrator
    ejs.feature = 'penguins_table'
})

ejs_events.on('edit_penguin', (ejs, web, player, penguin) => {
    ejs.success_message = `Manage ${penguin.username}'s penguin`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.penguin = penguin
    ejs.administrator = player.administrator
    ejs.feature = 'edit_penguin'
})

ejs_events.on('edit_username', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s username`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_username'
})

ejs_events.on('edit_email', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s email`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_email'
})

ejs_events.on('edit_nickname', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Nickname}'s nickname`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_nickname'
})

ejs_events.on('edit_password', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s password`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_password'
})

ejs_events.on('edit_coins', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s coins`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_coins'
})

ejs_events.on('edit_rank', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s rank`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_rank'
})

ejs_events.on('edit_name_color', (ejs, web, player, penguin) => {
    ejs.success_message = `Edit ${penguin.Username}'s namecolor`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_namecolor'
})

ejs_events.on('email_taken_admin', (ejs, web, player, penguin, email_given) => {
    ejs.success_message = ''
    ejs.error_message = `The email ${email_given} already exists!`
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_email'
})

ejs_events.on('username_taken_admin', (ejs, web, player, penguin, username_given) => {
    ejs.success_message = ''
    ejs.error_message = `The username ${username_given} already exists!`
    ejs.site_key = web.site_key
    ejs.id = penguin.ID
    ejs.administrator = player.administrator
    ejs.feature = 'edit_username'
})

ejs_events.on('update_successful', (ejs, web, player, original_value=null, new_username=null) => {
    if(original_value && new_username){
        ejs.success_message = `Successfully updated from ${original_value} to ${new_username}`
        ejs.error_message = ''
        ejs.site_key = web.site_key
        ejs.administrator = player.administrator
        ejs.feature = ''
    }
    else{
        ejs.success_message = `Successfully updated user details.`
        ejs.error_message = ''
        ejs.site_key = web.site_key
        ejs.administrator = player.administrator
        ejs.feature = ''
    }
})

ejs_events.on('banned_user_404', (ejs, web, player, id) => {
    ejs.success_message = ''
    ejs.error_message = `The user ID ${id} was not found in our systems.`
    ejs.site_key = web.site_key
    ejs.bans = player.ban_data
    ejs.moderator = player.moderator
    ejs.feature = 'unban'
})

ejs_events.on('user_not_banned', (ejs, web, player, username) => {
    ejs.success_message = ''
    ejs.error_message = `The user ${username} is not banned on CPRI.`
    ejs.site_key = web.site_key
    ejs.bans = player.ban_data
    ejs.moderator = player.moderator
    ejs.feature = 'unban'
})

ejs_events.on('unban_successful', (ejs, web, player, username) => {
    ejs.success_message = ''
    ejs.error_message = `The user ${username} was successfully unbanned from CPRI.`
    ejs.site_key = web.site_key
    ejs.bans = player.ban_data
    ejs.moderator = player.moderator
    ejs.feature = 'unban'
})

ejs_events.on('redemption', (ejs, web) => {
    ejs.success_message = 'Redeem a code.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'
})

ejs_events.on('ban', (ejs, web, player) => {
    ejs.success_message = 'Ban a player.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'ban'
})

ejs_events.on('ban_target_404', (ejs, web, player, username) => {
    ejs.success_message = ''
    ejs.error_message = `The username ${username} does not exist.`
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'ban'
})

ejs_events.on('ban_successful', (ejs, web, player, username) => {
    ejs.success_message = ''
    ejs.error_message = `${username} has successfully been banned from CPRI.`
    ejs.site_key = web.site_key
    ejs.moderator = player.moderator
    ejs.feature = 'ban'
})

ejs_events.on('expired_code', (ejs, web, code) => {
    ejs.success_message = ''
    ejs.error_message = `Sorry, this code (${code}) is expired.`
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'
})

ejs_events.on('already_redeemed', (ejs, web, code) => {
    ejs.success_message = ''
    ejs.error_message = `You have already redeemed this code (${code}).`
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'
})

ejs_events.on('redemption_captcha', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'
})

ejs_events.on('email', (ejs, web) => {
    ejs.success_message = 'Enter a new email address for your account. This will be used when you need to reset your password.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'email'
})

ejs_events.on('logs', (ejs, config, player) => {
    if(player.moderator){
        ejs.moderator = true
        ejs.administrator = false
        ejs.owner = false
        ejs.success_message = 'Download the following logs.'
        ejs.error_message = ''
        ejs.site_key = config.web.site_key
        ejs.feature = 'logs'
    }

    if(player.administrator){
        ejs.moderator = true
        ejs.administrator = true
        ejs.owner = false
        ejs.success_message = 'Download the following logs.'
        ejs.error_message = ''
        ejs.site_key = config.web.site_key
        ejs.feature = 'logs'
    }

    if(config.owners.includes(player.username)){
        ejs.moderator = true
        ejs.administrator = true
        ejs.owner = true
        ejs.success_message = 'Download the following logs.'
        ejs.error_message = ''
        ejs.site_key = config.web.site_key
        ejs.feature = 'logs'
    }

})

ejs_events.on('password', (ejs, web) => {
    ejs.success_message = 'Enter a new password for your account.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'password'
})

ejs_events.on('password_successful', (ejs, web) => {
    ejs.success_message = 'You have successfully updated your password.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'password'
})

ejs_events.on('same_password', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Please use a different password.'
    ejs.site_key = web.site_key
    ejs.feature = 'password'
})

ejs_events.on('incorrect_old_password', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your old password is incorrect.'
    ejs.site_key = web.site_key
    ejs.feature = 'password'
})

ejs_events.on('password_captcha', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = web.site_key
    ejs.feature = 'password'
})

ejs_events.on('email_captcha', (ejs, web) => {
    ejs.success_message = ''
    ejs.error_message = 'Your captcha score was low, please try again.'
    ejs.site_key = web.site_key
    ejs.feature = 'email'
})

ejs_events.on('change_email_taken', (ejs, web, email) => {
    ejs.success_message = ''
    ejs.error_message = `The email you gave (${email}) is already registered within our systems. Please try another one.`
    ejs.site_key = web.site_key
    ejs.feature = 'email'
})

ejs_events.on('email_successful', (ejs, web, email) => {
    ejs.success_message = `You have successfully updated your email to (${email}).`
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'email'
})

ejs_events.on('successful_redemption', (ejs, web, code, awards) => {
    ejs.success_message = `Congratulations, you have successfully redeemed the code ${code.Code}. `
    ejs.error_message = ''
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'

    if(code.Coins !== 0){
        ejs.success_message += `You have been awarded ${code.Coins} coins. You have also been awarded the following items: `
    }

    if(awards.length !== 0){
        ejs.success_message += `You have also been awarded ${awards.length} items`
    }
})

ejs_events.on('404_code', (ejs, web, code) => {
    ejs.success_message = ''
    ejs.error_message = `The redemption code (${code}) was not found within our systems.`
    ejs.site_key = web.site_key
    ejs.feature = 'redemption'
})

ejs_events.on('logged_out', (ejs, web) => {
    ejs.success_message = 'You have successfully logged out of your account.'
    ejs.error_message = ''
    ejs.site_key = web.site_key
})

ejs_events.on('404_page', (ejs, url) => {
    ejs.requested_link = url
})

ejs_events.on('403_page', (ejs, url) => {
    ejs.requested_link = url
})


module.exports = ejs_events