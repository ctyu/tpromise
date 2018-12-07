// tes
(function(){
    'use strict';

    /**
     * 改变promise的status
     */
    var changeStatus = function(promise, status, value){
        if (promise.status === 'PENDING'){
            promise.status = status;
            promise.value = value;
            return true;
        }
        return false;
    }

    var runAsync = function(fn){
        setTimeout(fn,0);
    }


    var reject = function(promise, value){
        if(changeStatus(promise, 'REJECTED', value)){
            promise.done();
        }
    }

    var fulfill = function(promise, value){
        if(changeStatus(promise, 'FULFILLED', value)){
            promise.done();
        }
    }

    var isObject = function(x){
        return x && typeof x === 'object';
    }

    var isFunction = function(x){
        return typeof x === 'function';
    }

    var isPromise = function(promise){
        return promise instanceof TPromise;
    }

    var process = function(promise, x){
        var _promise = promise._promise;
        var x_promise = x && x._promise;
        // promise解析逻辑
        // 如果promise 和 x 指向相同的值, 使用 TypeError做为原因将promise拒绝
        if (promise === x){
            reject(_promise, new TypeError("The promise and its value refer to the same object"));
            return;
        }

        if (isPromise(x_promise)){
            var status = x_promise.status;
            if (status === 'PENDING'){
                // 处于pending状态
                x.then(function(value){
                    fulfill(_promise, value);
                },function(value){
                    reject(_promise, value);
                });
            }else if(status === 'FULFILLED'){
                // FULFILLED
                fulfill(_promise, x_promise.value);
            }else{
                // REJECTED
                reject(_promise, x_promise.value);
            }
            return;
        }

        if(isObject(x) || isFunction(x)){
            // function 或者 object
            var then, called = false;
            try{
                then = x.then;
            }catch(e){
                reject(_promise, e);
                return;
            }
            if (isFunction(then)){
                try {
                    then.call(x, function(y){
                        if(!called){
                            called = true;
                            process(promise, y);
                        }
                    },function(r){
                        if(!called){
                            called = true;
                            reject(_promise, r);
                        }
                    });
                }catch(e){
                    if (!called)
                        reject(_promise, e);
                }
            }else{
                fulfill(_promise, x);
            }
            return;
        }

        fulfill(_promise, x);
    }

    var check = function(promise){
        if (promise.status === 'PENDING')
            return;
        promise.done();
    }

    function TPromise(fn){
        this.status = 'PENDING';
        this.queue = [];
        this.value;
        var _promise = this;
        var deferred =  {
            'then': function(onFulfill, onReject){
                var p = new TPromise();
                _promise.queue.push({
                    'onFulfill': onFulfill,
                    'onReject': onReject,
                    'nextP': p
                });
                check(_promise);
                return p;
            },
            'construct': TPromise,
            '_promise': _promise
        }
        if(isFunction(fn)){
            fn(function(v){
                process(deferred, v);
            },function(v){
                reject(_promise, v);
            });
        }
        return deferred;
    }

    TPromise.prototype.getValue = function(){
        return this.value;
    }

    TPromise.prototype.done = function(){
        var me = this;
        var status = me.status;
        if (status === 'PENDING')
            return;
        var handler, nextP, v;
        // a = new Promise(function(fulf, rej){
        //  rej();
        //  window.aaa = true;
        // })
        //
        runAsync(function(){
            while(me.queue.length){
                v = me.queue.shift();
                handler = status === 'REJECTED' ? v.onReject : v.onFulfill;
                nextP = v.nextP;
                if(!isFunction(handler)){
                    status === 'REJECTED' ? reject(nextP._promise, me.value) : fulfill(nextP._promise, me.value);
                    continue;
                }
                var rv;
                try{
                    rv = handler.call(undefined, me.value);
                }catch(e){
                    reject(nextP._promise, e);
                    continue;
                }
                process(nextP, rv);
            }
        })

    }

    // window.TPromise = TPromise;
    module.exports = {
        resolved: function (value) {
            return new TPromise(function (resolve) {
                resolve(value);
            });
        },
        rejected: function (reason) {
            return new TPromise(function (resolve, reject) {
                reject(reason);
            });
        },
        deferred: function () {
            var resolve, reject;

            return {
                promise: new TPromise(function (rslv, rjct) {
                    resolve = rslv;
                    reject = rjct;
                }),
                resolve: resolve,
                reject: reject
            };
        }
    }
})()
