/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

window.z = window.z || {};
window.z.backup = z.backup || {};

z.backup.BackupRepository = class BackupRepository {
  /**
   * Construct a new Backup repository.
   * @class z.backup.BackupRepository
   * @param {z.backup.BackupService} backupService - Backup service implementation
   * @param {z.client.ClientRepository} clientRepository - Repository for all client interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(backupService, clientRepository, userRepository) {
    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;
    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.BACKUP.EXPORT.DONE, this.onExportDone.bind(this));
    amplify.subscribe(z.event.WebApp.BACKUP.EXPORT.START, this.onExportHistory.bind(this));

    amplify.subscribe(z.event.WebApp.BACKUP.IMPORT.DATA, this.onImportHistory.bind(this));
    amplify.subscribe(z.event.WebApp.BACKUP.IMPORT.ERROR, this.onError.bind(this));
    amplify.subscribe(z.event.WebApp.BACKUP.IMPORT.META, this.onImportMeta.bind(this));
  }

  createMetaDescription() {
    return {
      client_id: this.clientRepository.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Desktop',
      user_id: this.userRepository.self().id,
      version: this.backupService.getDatabaseVersion(),
    };
  }

  cancelBackup() {
    amplify.publish(z.event.WebApp.BACKUP.EXPORT.CANCEL);
  }

  exportHistory() {
    this.backupService.getHistoryCount().then(entryContainer => {
      const numberOfRecords = entryContainer.reduce((accumulator, entries) => accumulator + entries, 0);
      amplify.publish(z.event.WebApp.BACKUP.EXPORT.INIT, numberOfRecords);
    });
  }

  importHistory() {
    const databaseVersion = this.backupService.storageService.getDatabaseVersion();
    const userId = this.userRepository.self().id;
    amplify.publish(z.event.WebApp.BACKUP.IMPORT.START, userId, databaseVersion);
  }

  onExportDone() {
    // TODO
  }

  onError(error) {
    // TODO: Error modal
    if (error.constructor.name === 'BackupImportError') {
      alert('Meta Data Error!');
    } else {
      alert(error.message);
    }
  }

  onImportHistory(tableName, data) {
    this.backupService.setHistory(tableName, data);
  }

  onImportMeta(metaData) {
    this.backupService.setMetadata(metaData);
  }

  onExportHistory() {
    const metadata = this.createMetaDescription();
    this.backupService.getHistory().then(tables => {
      for (const table of tables) {
        for (const batch of table.batches) {
          amplify.publish(z.event.WebApp.BACKUP.EXPORT.DATA, table.name, batch);
        }
      }
      amplify.publish(z.event.WebApp.BACKUP.EXPORT.META, metadata);
    });
  }
};
