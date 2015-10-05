---
layout: post
title: "AFNetworking 2.0 是如何发送网络请求的?"
date: 2015-10-05 22:11
comments: true
categories:
---


# AFNetworking 2.0 是如何发送网络请求的?

## 原始方法
我们在开发 iOS , Mac App 的过程当中一定有接触过发送网络请求, 最初我们有使用的是这样的:

1. 创建一个类, 然后使用 __NSURLConnectionDelegate__

2. 初始化 并发送 请求, 类似这样


```

NSURL *httpsURL = [NSURL URLWithString:@"http://sunus.me";

// prepare parameters
NSString *postString = [NSString stringWithFormat:@"param1=%@&param2=%@", @"para1", @"para2"];
NSData *postData = [postString dataUsingEncoding:NSASCIIStringEncoding allowLossyConversion:YES];
NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:httpsURL cachePolicy:NSURLRequestReloadIgnoringLocalAndRemoteCacheData timeoutInterval:60.0f];
[request setHTTPMethod:@"POST"];
[request setValue:[NSString stringWithFormat:@"%lu", (unsigned long)[postData length]] forHTTPHeaderField:@"Content-Length"];
[request setHTTPBody:postData];

// send the request
self.connection = [NSURLConnection connectionWithRequest:request delegate:self];

```

3. 然后在这几个 Delegate 方法里添加对于的处理返回值的逻辑.(实现略)

```
- (void)connectionDidFinishLoading:(NSURLConnection *)connection;
- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data;
- (void)connection:(NSURLConnection *)connection didReceiveResponse:(NSURLResponse *)response;
- (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error;
```

## 使用 Block.
在 Objective-C 有了 Block 之后, 有很多的网络框架都支持了 Block 的接口. 一般方法声明为这样:

```
typedef void(^success)(id response);
typedef void(^failure)(NSError *error);

-(void)makeSomeRequest:(success)successBlock
                  fail:(failure)failBlock;

```

然后这样使用

```
[httpClient makeSomeRequest:^(id response) {
    // do stuff with response
    NSLog(@"%@", response);
} fail:^(NSError *error) {
    // handle the error
    NSLog(@"%@", error);
}];
```

这类方法的实现也比较简单, 主要就是在 makeSomeRequest 里, 把两个回调用 copy 住. 然后在原始方法的Delegate 当中, 比如 __- (void)connection:(NSURLConnection *)connection didReceiveData:(NSData *)data __ 以及 __ - (void)connection:(NSURLConnection *)connection didFailWithError:(NSError *)error __ 当中再调用对应的 block 方法即可.

## 使用AFNetworking

AFNetworking 则是做了更多的封装, 这也是我们需要重点研究的, __ AFNetworking 到底 是如何将一个 请求发送出去的 ? __

本文是以 AFNetworking 2.5.4 为例子, 调用一个 HTTP GET 请求的代码如下:

```
[[AFAppDotNetAPIClient sharedClient] GET:@"stream/0/posts/stream/global" parameters:nil success:^(__unused AFHTTPRequestOperation *operation, id responseObject) {
           NSArray *postsFromResponse = [responseObject valueForKeyPath:@"data"];
        NSMutableArray *mutablePosts = [NSMutableArray arrayWithCapacity:[postsFromResponse count]];
        for (NSDictionary *attributes in postsFromResponse) {
            Post *post = [[Post alloc] initWithAttributes:attributes];
            [mutablePosts addObject:post];
        }

        if (block) {
            block([NSArray arrayWithArray:mutablePosts], nil);
        }
    } failure:^(__unused AFHTTPRequestOperation *operation, NSError *error) {
        if (block) {
            block([NSArray array], error);
        }
    }];
```

AFAppDotNetAPIClient 的实现如下, 可以看到, 他的基类是 __AFHTTPRequestOperationManager__

```

#import <Foundation/Foundation.h>
#import "AFHTTPRequestOperationManager.h"

@interface AFAppDotNetAPIClient : AFHTTPRequestOperationManager

+ (instancetype)sharedClient;

@end

static NSString * const AFAppDotNetAPIBaseURLString = @"https://api.app.net/";

@implementation AFAppDotNetAPIClient

+ (instancetype)sharedClient {
    static AFAppDotNetAPIClient *_sharedClient = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        _sharedClient = [[AFAppDotNetAPIClient alloc] initWithBaseURL:[NSURL URLWithString:AFAppDotNetAPIBaseURLString]];
        _sharedClient.securityPolicy = [AFSecurityPolicy policyWithPinningMode:AFSSLPinningModeNone];
    });
    
    return _sharedClient;
}

@end
```

### 跟着我左手右手一个慢动作..

1. 我们先看看 __[AFAppDotNetAPIClient GET]__ 方法干了什么事情,  该方法直接调用的是基类的 GET 方法.

``` 
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFHTTPRequestOperationManager.m:137

- (AFHTTPRequestOperation *)GET:(NSString *)URLString
                     parameters:(id)parameters
                        success:(void (^)(AFHTTPRequestOperation *operation, id responseObject))success
                        failure:(void (^)(AFHTTPRequestOperation *operation, NSError *error))failure
{
    AFHTTPRequestOperation *operation = [self HTTPRequestOperationWithHTTPMethod:@"GET" URLString:URLString parameters:parameters success:success failure:failure];

    [self.operationQueue addOperation:operation];

    return operation;
}
```

很简单, 就是创建一个 __AFHTTPRequestOperation__ , 然后放到 __operationQueue__ , 然后返回这个 operation. 目前来看 , 返回的 operation 暂时对我们来说是没有用的, 那我们就要重点研究, 创建 __operation__ 的过程中发生看什么事, 以及 这个 __operationQueue__ 到底是什么鬼.

2. 先看

```
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFHTTPRequestOperationManager.m:94

- (AFHTTPRequestOperation *)HTTPRequestOperationWithHTTPMethod:(NSString *)method
                                                     URLString:(NSString *)URLString
                                                    parameters:(id)parameters
                                                       success:(void (^)(AFHTTPRequestOperation *operation, id responseObject))success
                                                       failure:(void (^)(AFHTTPRequestOperation *operation, NSError *error))failure
{
    NSError *serializationError = nil;
    NSMutableURLRequest *request = [self.requestSerializer requestWithMethod:method URLString:[[NSURL URLWithString:URLString relativeToURL:self.baseURL] absoluteString] parameters:parameters error:&serializationError];
    if (serializationError) {
        if (failure) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wgnu"
            dispatch_async(self.completionQueue ?: dispatch_get_main_queue(), ^{
                failure(nil, serializationError);
            });
#pragma clang diagnostic pop
        }

        return nil;
    }

    return [self HTTPRequestOperationWithRequest:request success:success failure:failure];
}
```


在这里, 暂时先把 requestSerializer 忽略, 看 __ HTTPRequestOperationWithReques __

```
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFHTTPRequestOperationManager.m:118

- (AFHTTPRequestOperation *)HTTPRequestOperationWithRequest:(NSURLRequest *)request
                                                    success:(void (^)(AFHTTPRequestOperation *operation, id responseObject))success
                                                    failure:(void (^)(AFHTTPRequestOperation *operation, NSError *error))failure
{
    AFHTTPRequestOperation *operation = [[AFHTTPRequestOperation alloc] initWithRequest:request];
    operation.responseSerializer = self.responseSerializer;
    operation.shouldUseCredentialStorage = self.shouldUseCredentialStorage;
    operation.credential = self.credential;
    operation.securityPolicy = self.securityPolicy;

    [operation setCompletionBlockWithSuccess:success failure:failure];
    operation.completionQueue = self.completionQueue;
    operation.completionGroup = self.completionGroup;

    return operation;
}
```
在这里, 我看到了一开始的 __operation__ 是在这里得到初始化的. 接下来, 那个 __setCompletionBlockWithSuccess__ 看起来就是把 success , failure 这两个 block 给 hold 住的地方. 但是, 仅仅做了这些事情吗? 继续看.

```
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFHTTPRequestOperation.m:107
- (void)setCompletionBlockWithSuccess:(void (^)(AFHTTPRequestOperation *operation, id responseObject))success
                              failure:(void (^)(AFHTTPRequestOperation *operation, NSError *error))failure
{
    // completionBlock is manually nilled out in AFURLConnectionOperation to break the retain cycle.
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-retain-cycles"
#pragma clang diagnostic ignored "-Wgnu"
    self.completionBlock = ^{
        if (self.completionGroup) {
            dispatch_group_enter(self.completionGroup);
        }

        dispatch_async(http_request_operation_processing_queue(), ^{
            if (self.error) {
                if (failure) {
                    dispatch_group_async(self.completionGroup ?: http_request_operation_completion_group(), self.completionQueue ?: dispatch_get_main_queue(), ^{
                        failure(self, self.error);
                    });
                }
            } else {
                id responseObject = self.responseObject;
                if (self.error) {
                    if (failure) {
                        dispatch_group_async(self.completionGroup ?: http_request_operation_completion_group(), self.completionQueue ?: dispatch_get_main_queue(), ^{
                            failure(self, self.error);
                        });
                    }
                } else {
                    if (success) {
                        dispatch_group_async(self.completionGroup ?: http_request_operation_completion_group(), self.completionQueue ?: dispatch_get_main_queue(), ^{
                            success(self, responseObject);
                        });
                    }
                }
            }

            if (self.completionGroup) {
                dispatch_group_leave(self.completionGroup);
            }
        });
    };
#pragma clang diagnostic pop
}
```
在这里, 主要是请求的成功 / 失败 两种结果, 通过 __dispatch_async__ 放到了 __http_request_operation_processing_queue()__ 这个队列当中执行, 暂时不用太纠结这个队列, 就当成是一个队列就好了. 成功执行 __success(self, responseObject) __ , 失败 执行 __failure(self, self.error);__

我们还要注意一点, 这里其实还没到头,

```
self.completionBlock = ^{
    ...
};
```
这里, 其实还有调用了 __setCompletionBlock__ 方法, 如下

```
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFURLConnectionOperation.m:400
- (void)setCompletionBlock:(void (^)(void))block {
    [self.lock lock];
    if (!block) {
        [super setCompletionBlock:nil];
    } else {
        __weak __typeof(self)weakSelf = self;
        [super setCompletionBlock:^ {
            __strong __typeof(weakSelf)strongSelf = weakSelf;

#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wgnu"
            dispatch_group_t group = strongSelf.completionGroup ?: url_request_operation_completion_group();
            dispatch_queue_t queue = strongSelf.completionQueue ?: dispatch_get_main_queue();
#pragma clang diagnostic pop

            dispatch_group_async(group, queue, ^{
                block();
            });

            dispatch_group_notify(group, url_request_operation_completion_queue(), ^{
                [strongSelf setCompletionBlock:nil];
            });
        }];
    }
    [self.lock unlock];
}
```

这里, 应该是最开始1中的

```
 AFHTTPRequestOperation *operation = [self HTTPRequestOperationWithHTTPMethod:@"GET" URLString:URLString parameters:parameters success:success failure:failure];
```

结束的地方.

但是, 我们感觉好似还有好多事情没搞清楚.. 比如, 这个请求, 到底是, 什么时候, 被发出去的? 如果我们有抓包的话, 可以看到执行完这行代码之后, 其实请求还没发送出去.



接下来, 我们看1中还有哪些地方可以研究.

``` 
// AFNetworking Source Code
// AFNetworking/AFNetworking/AFHTTPRequestOperationManager.m:137

- (AFHTTPRequestOperation *)GET:(NSString *)URLString
                     parameters:(id)parameters
                        success:(void (^)(AFHTTPRequestOperation *operation, id responseObject))success
                        failure:(void (^)(AFHTTPRequestOperation *operation, NSError *error))failure
{
    AFHTTPRequestOperation *operation = [self HTTPRequestOperationWithHTTPMethod:@"GET" URLString:URLString parameters:parameters success:success failure:failure];

    [self.operationQueue addOperation:operation];

    return operation;
}
```

对了, 就是这个. __[self.operationQueue addOperation:operation];__ 如果我们知道什么是 _NSOperation_ 以及什么是 _NSOperationQueue_ 的话, 那么, 问题就明朗很多. 简单来说.
	每个 NSOperation 都会有几个方法 , __start__ , __exectuing__ , __finish__ , __cancel__ 等几种状态, 当把一个 NSOperation 添加到 NSOperationQueue 时, 会自动调用 NSOperation 的 __start__ 方法.
	
看到这里

_AFNetworking/NSURLConnection/AFURLConnectionOperation.m_

里, 那些熟悉的 Delegate 又回来了:) 看看那些方法, 就知道请求是从这儿发出去的:)

```
//AFNetworking/NSURLConnection/AFURLConnectionOperation.m:443

- (void)start {
    [self.lock lock];
    if ([self isCancelled]) {
        [self performSelector:@selector(cancelConnection) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]];
    } else if ([self isReady]) {
        self.state = AFOperationExecutingState;

        [self performSelector:@selector(operationDidStart) onThread:[[self class] networkRequestThread] withObject:nil waitUntilDone:NO modes:[self.runLoopModes allObjects]];
    }
    [self.lock unlock];
}

- (void)operationDidStart {
    [self.lock lock];
    if (![self isCancelled]) {
        self.connection = [[NSURLConnection alloc] initWithRequest:self.request delegate:self startImmediately:NO];

        NSRunLoop *runLoop = [NSRunLoop currentRunLoop];
        for (NSString *runLoopMode in self.runLoopModes) {
            [self.connection scheduleInRunLoop:runLoop forMode:runLoopMode];
            [self.outputStream scheduleInRunLoop:runLoop forMode:runLoopMode];
        }

        [self.outputStream open];
        [self.connection start];
    }
    [self.lock unlock];

    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:AFNetworkingOperationDidStartNotification object:self];
    });
}

- (void)finish {
    [self.lock lock];
    self.state = AFOperationFinishedState;
    [self.lock unlock];

    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:AFNetworkingOperationDidFinishNotification object:self];
    });
}
```

最后, 当 finish 之后, 会调用最初的 completionBlock. 就完成了一次请求的收发.

Happy coding!
