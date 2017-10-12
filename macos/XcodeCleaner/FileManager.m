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
  
//  NSString* file;
//  NSDirectoryEnumerator* enumerator = [[NSFileManager defaultManager] enumeratorAtPath:path];
//  NSMutableArray *results = [[NSMutableArray alloc] init];
//
//  while (file = [enumerator nextObject])
//  {
//    BOOL isDirectory = NO;
//    NSString* fullPath = [path stringByAppendingPathComponent:file];
//
//    if (!onlyDirectory){
//      [results addObject:[path stringByAppendingPathComponent:file]];
//      continue;
//    }
//
//    [[NSFileManager defaultManager] fileExistsAtPath:fullPath
//                                         isDirectory: &isDirectory];
//    if (isDirectory)
//    {
//      [results addObject:[path stringByAppendingPathComponent:file]];
//    }
//
//  }
  resolve(results);
}


RCT_EXPORT_METHOD(getDirectorySize:(NSString *)path
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject
                  )
{
  resolve([NSNumber numberWithUnsignedLongLong:100*1024*1024]);
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
    }
    for (NSString *file in newURLs) {
      NSLog(@"File %@ moved to %@", file, [newURLs objectForKey:file]);
    }
  }];
}


-(unsigned long long) fastFolderSizeAtFSRef:(FSRef*) theFileRef
{
  FSIterator    thisDirEnum = NULL;
  unsigned long long totalSize = 0;
  
  // Iterate the directory contents, recursing as necessary
  if (FSOpenIterator(theFileRef, kFSIterateFlat, &thisDirEnum) ==
      noErr)
  {
    const ItemCount kMaxEntriesPerFetch = 256;
    ItemCount actualFetched;
    FSRef    fetchedRefs[kMaxEntriesPerFetch];
    FSCatalogInfo fetchedInfos[kMaxEntriesPerFetch];
    
    
    OSErr fsErr = FSGetCatalogInfoBulk(thisDirEnum,
                                       kMaxEntriesPerFetch, &actualFetched,
                                       NULL, kFSCatInfoDataSizes |
                                       kFSCatInfoNodeFlags, fetchedInfos,
                                       fetchedRefs, NULL, NULL);
    while ((fsErr == noErr) || (fsErr == errFSNoMoreItems))
    {
      ItemCount thisIndex;
      for (thisIndex = 0; thisIndex < actualFetched; thisIndex++)
      {
        // Recurse if it's a folder
        if (fetchedInfos[thisIndex].nodeFlags &
            kFSNodeIsDirectoryMask)
        {
          totalSize += [self
                        fastFolderSizeAtFSRef:&fetchedRefs[thisIndex]];
        }
        else
        {
          // add the size for this item
          totalSize += fetchedInfos
          [thisIndex].dataLogicalSize;
        }
      }
      
      if (fsErr == errFSNoMoreItems)
      {
        break;
      }
      else
      {
        // get more items
        fsErr = FSGetCatalogInfoBulk(thisDirEnum,
                                     kMaxEntriesPerFetch, &actualFetched,
                                     NULL, kFSCatInfoDataSizes |
                                     kFSCatInfoNodeFlags, fetchedInfos,
                                     fetchedRefs, NULL, NULL);
      }
    }
    FSCloseIterator(thisDirEnum);
  }
  return totalSize;
}

@end

