//
//  FileManager.m
//  XcodeCleaner
//
//  Created by Baye Wayly on 2017/10/12.
//  Copyright © 2017年 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Carbon/Carbon.h>
#import <AppKit/AppKit.h>
#import <React/RCTConvert.h>

#import "FileManager.h"
#include <dirent.h>
#include <sys/stat.h>

NSError* newError(NSString * message){
  NSMutableDictionary* details = [NSMutableDictionary dictionary];
  [details setValue:message forKey:NSLocalizedDescriptionKey];
  return [NSError errorWithDomain:@"XcodeCleaner" code:403 userInfo:details];
}


@implementation FileManager
{
}


RCT_EXPORT_MODULE()


RCT_REMAP_METHOD(getHomeDirectory,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSLog(@"home %@", NSHomeDirectory());
  NSString * username = NSUserName();
//  resolve(NSHomeDirectory());
  resolve([NSString stringWithFormat:@"/Users/%@", username]);
}


RCT_EXPORT_METHOD(authorize: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSLog(@"try to auth %@", path);
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  NSString* key = [@"bookmark:" stringByAppendingString:path];
                              
  NSData *bookmarkData = [defaults objectForKey:key];
  
  if (bookmarkData){
    NSError* error = [self resolveBookmark:bookmarkData key:key];
    
    if (!error){
      resolve(path);
    } else {
      reject(@"error", error.description, error);
    }
    
    return;
  }
  
  dispatch_async(dispatch_get_main_queue(), ^{
    NSOpenPanel* panel = [NSOpenPanel openPanel];
    panel.canChooseFiles = NO;
    panel.allowsMultipleSelection = NO;
    panel.canChooseDirectories = YES;
    panel.directoryURL = [NSURL fileURLWithPath:path isDirectory:YES];
    panel.prompt = @"Authorize";
    
    [panel beginWithCompletionHandler:^(NSInteger result) {
      if (result == NSOKButton) {
        NSURL *url = [[panel URLs] firstObject];
        
        NSData *bookmarkData =[url bookmarkDataWithOptions:NSURLBookmarkCreationWithSecurityScope includingResourceValuesForKeys:nil relativeToURL:nil error:NULL];
        
        NSString *key = [@"bookmark:" stringByAppendingString:url.path];
        [defaults setObject:bookmarkData forKey:key];
        NSError* error = [self resolveBookmark:bookmarkData key:key];
        
        if (!error){
          resolve(url.path);
        } else {
          reject(@"error", error.description, error);
        }
        
      } else {
        NSError *error = newError(@"User cancelled authorization.");
        reject(@"error", error.description, error);
      }
    }];
  });
}

RCT_EXPORT_METHOD(stopAuthorization: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
  NSString* key = [@"bookmark:" stringByAppendingString:path];
  NSData *bookmark = [defaults objectForKey:key];
  
  if (bookmark){
    BOOL isStale;
    NSError *error;
    NSURL *url = [NSURL URLByResolvingBookmarkData:bookmark
                                           options:NSURLBookmarkResolutionWithSecurityScope
                                     relativeToURL:nil
                               bookmarkDataIsStale:&isStale
                                             error:&error];
    if (!error){
      [url stopAccessingSecurityScopedResource];
    }
  }
}


-(NSError *) resolveBookmark: (NSData *)bookmark
                         key: (NSString *)key
{
  BOOL isStale;
  NSError *error;
  NSURL *url = [NSURL URLByResolvingBookmarkData:bookmark
                                         options:NSURLBookmarkResolutionWithSecurityScope
                                   relativeToURL:nil
                             bookmarkDataIsStale:&isStale
                                           error:&error];
  if (error != nil) {
    NSLog(@"Error resolving URL from bookmark: %@", error);
    return error;
    
  } else if (isStale) {
    //    if ([url startAccessingSecurityScopedResource]) {
    NSLog(@"Attempting to renew bookmark for %@", url);
    bookmark = [url bookmarkDataWithOptions:NSURLBookmarkCreationWithSecurityScope
             includingResourceValuesForKeys:nil
                              relativeToURL:nil
                                      error:&error];
    
    //      [url stopAccessingSecurityScopedResource];
    if (error != nil) {
      NSLog(@"Failed to renew bookmark: %@", error);
      return error;
    }
    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    [defaults setObject:bookmark forKey:key];
    NSLog(@"Bookmark renewed, yay.");
    
    return [self resolveBookmark:bookmark key:key];
  }
  
  NSLog(@"Bookmarked url resolved successfully!");
  if (![url startAccessingSecurityScopedResource]){
    NSMutableDictionary* details = [NSMutableDictionary dictionary];
    [details setValue:@"startAccessingSecurityScopedResource failed" forKey:NSLocalizedDescriptionKey];
    return [NSError errorWithDomain:@"XcodeCleaner" code:403 userInfo:details];
  }
  return nil;
}


RCT_EXPORT_METHOD(parsePlist: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSDictionary *theDict = [NSDictionary dictionaryWithContentsOfFile:path];
  resolve(theDict);
}


RCT_EXPORT_METHOD(revealInFinder: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSArray *fileURLs = [NSArray arrayWithObjects:[NSURL fileURLWithPath:path isDirectory:YES], nil];
  [[NSWorkspace sharedWorkspace] activateFileViewerSelectingURLs:fileURLs];
}


RCT_EXPORT_METHOD(listDirectory: (NSString*) path
                  onlyDirectory:(BOOL) onlyDirectory
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSError *error;
  NSArray* dirs = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path
                                                                      error:&error];
  if (error){
    NSLog(@"@DEBUG error %@", error);
    reject(@"error", error.description, error);
    return;
  }
  
  NSMutableArray *results = [[NSMutableArray alloc] init];
  [dirs enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
    NSString* filename = (NSString *)obj;
    NSString* fullPath = [path stringByAppendingPathComponent:filename];
    
    BOOL isDirectory = NO;
    [[NSFileManager defaultManager] fileExistsAtPath:fullPath isDirectory:&isDirectory];
    
    if (!onlyDirectory){
      [results addObject:fullPath];
      
    } else if (isDirectory) {
      [results addObject:fullPath];
    }
  }];
  
  resolve(results);
}


RCT_EXPORT_METHOD(getDirectorySize:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  resolve([self sizeForFolderAtPath:path error:nil]);
}


RCT_EXPORT_METHOD(trashDirectory: (NSString*)path
                  withResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  NSURL *url = [NSURL fileURLWithPath:path isDirectory:YES];
  NSArray *files = [NSArray arrayWithObject: url];
  [[NSWorkspace sharedWorkspace] recycleURLs:files completionHandler:^(NSDictionary *newURLs, NSError *error) {
    if (error != nil) {
      //do something about the error
      NSLog(@"%@", error);
      reject(@"error", error.description, error);
      return;
    }
    for (NSString *file in newURLs) {
      NSLog(@"File %@ moved to %@", file, [newURLs objectForKey:file]);
    }
    resolve(nil);
  }];
}



- (NSNumber *)sizeForFolderAtPath:(NSString *) source error:(NSError **)error
{
  NSArray * contents;
  unsigned long long size = 0;
  NSEnumerator * enumerator;
  NSString * path;
  BOOL isDirectory;
  NSFileManager *fm = [NSFileManager defaultManager] ;
  // Determine Paths to Add
  if ([fm fileExistsAtPath:source isDirectory:&isDirectory] && isDirectory)
  {
    contents = [fm subpathsAtPath:source];
  }
  else
  {
    contents = [NSArray array];
  }
  // Add Size Of All Paths
  enumerator = [contents objectEnumerator];
  while (path = [enumerator nextObject])
  {
    NSDictionary * fattrs = [fm attributesOfItemAtPath: [ source stringByAppendingPathComponent:path ] error:error];
    size += [[fattrs objectForKey:NSFileSize] unsignedLongLongValue];
  }
  // Return Total Size in Bytes
  return [ NSNumber numberWithUnsignedLongLong:size];
}

@end

