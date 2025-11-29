module chat_app::chat_contract {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::{String};
    use std::vector;
    use sui::event;
    use sui::clock::{Self, Clock};

    // ========== Structs ==========

    public struct Profile has key, store {
        id: UID,
        username: String,
        avatar_url: String,
        owner: address
    }

    public struct ChatRoom has key {
        id: UID,
        messages: vector<Message> 
    }

    public struct Message has store, copy, drop {
        sender: address,
        text: String,
        timestamp: u64,
        read_by: vector<address>
    }

    public struct MessagePosted has copy, drop {
        sender: address,
        text: String,
        timestamp: u64
    }

    public struct ProfileUpdated has copy, drop {
        owner: address,
        username: String,
        avatar_url: String
    }

    public struct MessageRead has copy, drop {
        message_index: u64,
        reader: address,
        timestamp: u64
    }

    // ========== Functions ==========

    fun init(ctx: &mut TxContext) {
        let chat_room = ChatRoom {
            id: object::new(ctx),
            messages: vector::empty()
        };
        transfer::share_object(chat_room);
    }

    // 注意：這裡移除了 'entry' 關鍵字，只保留 'public'
    public fun create_profile(
        username: String,
        avatar_url: String,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let profile = Profile {
            id: object::new(ctx),
            username: username,
            avatar_url: avatar_url,
            owner: sender
        };

        event::emit(ProfileUpdated {
            owner: sender,
            username: username,
            avatar_url: avatar_url
        });

        transfer::transfer(profile, sender);
    }

    // 注意：這裡移除了 'entry' 關鍵字
    public fun update_profile(
        profile: &mut Profile,
        new_username: String,
        new_avatar_url: String,
        _ctx: &mut TxContext
    ) {
        profile.username = new_username;
        profile.avatar_url = new_avatar_url;

        event::emit(ProfileUpdated {
            owner: profile.owner,
            username: new_username,
            avatar_url: new_avatar_url
        });
    }

    // 注意：這裡移除了 'entry' 關鍵字
    public fun send_message(
        room: &mut ChatRoom, 
        text: String, 
        clock: &Clock, 
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        let msg = Message {
            sender: sender,
            text: text,
            timestamp: timestamp,
            read_by: vector::empty()
        };

        vector::push_back(&mut room.messages, msg);

        event::emit(MessagePosted {
            sender: sender,
            text: text,
            timestamp: timestamp
        });
    }

    // 標記訊息為已讀
    public fun mark_message_as_read(
        room: &mut ChatRoom,
        message_index: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let reader = tx_context::sender(ctx);
        let messages_len = vector::length(&room.messages);
        
        // 檢查訊息索引是否有效
        assert!(message_index < messages_len, 0);
        
        // 獲取訊息的可變引用
        let msg = vector::borrow_mut(&mut room.messages, message_index);
        
        // 檢查使用者是否已經標記過
        let already_read = vector::contains(&msg.read_by, &reader);
        
        if (!already_read) {
            // 將讀者地址加入到已讀列表
            vector::push_back(&mut msg.read_by, reader);
            
            // 發送已讀事件
            event::emit(MessageRead {
                message_index: message_index,
                reader: reader,
                timestamp: clock::timestamp_ms(clock)
            });
        }
    }
}