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


@implementation FileManager
{
}


RCT_EXPORT_MODULE()


RCT_REMAP_METHOD(getHomeDirectory,
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(NSHomeDirectory());
}

//RCT_REMAP_METHOD(getLibraryDirectory,
//                 resolver:(RCTPromiseResolveBlock)resolve
//                 rejecter:(RCTPromiseRejectBlock)reject)
//{
//  resolve(NSLibraryDirectory());
//}

RCT_EXPORT_METHOD(parsePlist: (NSString*) path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
//  NSArray *fileURLs = [NSArray arrayWithObjects:[NSURL fileURLWithPath:path isDirectory:YES], nil];
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
  NSArray* dirs = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path
                                                                      error:NULL];
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

