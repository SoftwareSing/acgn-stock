'use strict';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { lockManager } from '../../lockManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbOrders } from '../../db/dbOrders';
import { dbLog } from '../../db/dbLog';
import { dbDirectors } from '../../db/dbDirectors';

Meteor.methods({
  createBuyOrder(orderData) {
    check(this.userId, String);
    check(orderData, {
      companyName: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createBuyOrder(Meteor.user(), orderData);

    return true;
  }
});

export function createBuyOrder(user, orderData) {
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '購買單價不可小於1！');
  }
  if (orderData.amount < 1) {
    throw new Meteor.Error(403, '購買數量不可小於1！');
  }
  const totalCost = orderData.unitPrice * orderData.amount;
  if (user.profile.money < totalCost) {
    throw new Meteor.Error(403, '剩餘金錢不足，訂單無法成立！');
  }
  const companyName = orderData.companyName;
  const username = user.username;
  const existsSellOrder = dbOrders.findOne({
    companyName: companyName,
    username: user.username,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    throw new Meteor.Error(403, '有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');
  }
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (orderData.unitPrice < (companyData.lastPrice / 2)) {
    throw new Meteor.Error(403, '最低買入價格不可低於該股票當前價格的一半！');
  }
  if (orderData.unitPrice > (companyData.lastPrice * 2)) {
    throw new Meteor.Error(403, '最高買入價格不可高於該股票當前價格的兩倍！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  orderData.username = username;
  orderData.orderType = '購入';
  orderData.createdAt = new Date();
  dbLog.insert({
    logType: '購買下單',
    username: [username],
    companyName: companyName,
    price: orderData.unitPrice,
    amount: orderData.amount,
    createdAt: new Date()
  });
  Meteor.users.update({
    _id: user._id
  }, {
    $inc: {
      'profile.money': totalCost * -1
    }
  });
  dbOrders.insert(orderData);
  unlock();
}

Meteor.methods({
  createSellOrder(orderData) {
    check(this.userId, String);
    check(orderData, {
      companyName: String,
      unitPrice: Match.Integer,
      amount: Match.Integer
    });
    createSellOrder(Meteor.user(), orderData);

    return true;
  }
});

export function createSellOrder(user, orderData) {
  if (orderData.unitPrice < 1) {
    throw new Meteor.Error(403, '販賣單價不可小於1！');
  }
  if (orderData.amount < 1) {
    throw new Meteor.Error(403, '販賣數量不可小於1！');
  }
  const companyName = orderData.companyName;
  const username = user.username;
  const existsBuyOrder = dbOrders.findOne({
    companyName: companyName,
    username: user.username,
    orderType: '購入'
  });
  if (existsBuyOrder) {
    throw new Meteor.Error(403, '有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');
  }
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '不存在的公司股票，訂單無法成立！');
  }
  if (orderData.unitPrice < (companyData.lastPrice / 2)) {
    throw new Meteor.Error(403, '最低售出價格不可低於該股票當前價格的一半！');
  }
  if (orderData.unitPrice > (companyData.lastPrice * 2)) {
    throw new Meteor.Error(403, '最高售出價格不可高於該股票當前價格的兩倍！');
  }
  const directorData = dbDirectors.findOne({companyName, username});
  if (! directorData || directorData.stocks < orderData.amount) {
    throw new Meteor.Error(403, '擁有的股票數量不足，訂單無法成立！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  orderData.username = username;
  orderData.orderType = '賣出';
  orderData.createdAt = new Date();
  dbLog.insert({
    logType: '販賣下單',
    username: [username],
    companyName: companyName,
    price: orderData.unitPrice,
    amount: orderData.amount,
    createdAt: new Date()
  });
  if (directorData.stocks === orderData.amount) {
    dbDirectors.remove({companyName, username});
  }
  else {
    dbDirectors.update({companyName, username}, {
      $inc: {
        stocks: orderData.amount * -1
      }
    });
  }
  dbOrders.insert(orderData);
  unlock();
}

Meteor.methods({
  retrieveOrder(orderId) {
    check(this.userId, String);
    check(orderId, String);
    retrieveOrder(Meteor.user(), orderId);

    return true;
  }
});
export function retrieveOrder(user, orderId) {
  if (user.profile.money < 1) {
    throw new Meteor.Error(403, '無法支付手續費1元，撤回訂單失敗！');
  }
  const orderData = dbOrders.findOne(orderId);
  if (! orderData) {
    throw new Meteor.Error(404, '訂單已完成或已撤回，撤回訂單失敗！');
  }
  if (user.username !== orderData.username) {
    throw new Meteor.Error(401, '該訂單並非使用者所有，撤回訂單失敗！');
  }
  const companyName = orderData.companyName;
  const unlock = lockManager.lock([user._id, companyName]);
  const username = user.username;
  let increaseMoney = -1;
  if (orderData.orderType === '購入') {
    increaseMoney += (orderData.unitPrice * (orderData.amount - orderData.done));
  }
  dbLog.insert({
    logType: '取消下單',
    username: [username],
    companyName: companyName,
    price: orderData.unitPrice,
    amount: (orderData.amount - orderData.done),
    message: orderData.orderType,
    createdAt: new Date()
  });
  Meteor.users.update({_id: user._id}, {
    $inc: {
      'profile.money': increaseMoney
    }
  });
  if (orderData.orderType === '賣出') {
    const existDirectorData = dbDirectors.findOne({
      companyName: orderData.companyName,
      username: orderData.username
    });
    if (existDirectorData) {
      dbDirectors.update({
        _id: existDirectorData._id
      }, {
        $inc: {
          stocks: (orderData.amount - orderData.done)
        }
      });
    }
    else {
      dbDirectors.insert({
        companyName: orderData.companyName,
        username: orderData.username,
        stocks: (orderData.amount - orderData.done)
      });
    }
  }
  dbOrders.remove({
    _id: orderData._id
  });
  unlock();
}
