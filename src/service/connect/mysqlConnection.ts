import { Node } from "@/model/interface/node";
import * as fs from "fs";
import * as mysql from "mysql2";
import { IConnection, queryCallback } from "./connection";

export class MysqlConnection implements IConnection {
    private con: mysql.Connection;
    constructor(node: Node) {
        const newConnectionOptions = {
            host: node.host, port: node.port, user: node.user, password: node.password, database: node.database,
            timezone: node.timezone,
            multipleStatements: true, dateStrings: true, supportBigNumbers: true, bigNumberStrings: true,
            connectTimeout: 5000,
            typeCast: function (field, next) {
                // if (field.type === 'TINY' && field.length === 1) 
                if (field.type === 'JSON') {
                    return field?.buffer()?.toString();
                } else {
                    return next();
                }
            }
        } as mysql.ConnectionConfig;
        if (node.certPath && fs.existsSync(node.certPath)) {
            newConnectionOptions.ssl = {
                ca: fs.readFileSync(node.certPath),
            };
        }
        this.con = mysql.createConnection(newConnectionOptions);
    }
    isAlive(): boolean {
        return this.con.state == 'authenticated' || this.con.authorized
    }
    query(sql: string, callback?: queryCallback): void;
    query(sql: string, values: any, callback?: queryCallback): void;
    query(sql: any, values?: any, callback?: any) {
        this.con.query(sql, values, callback)
    }
    connect(callback: (err: Error) => void): void {
        this.con.connect(callback)
    }
    beginTransaction(callback: (err: Error) => void): void {
        this.con.beginTransaction(callback)
    }
    rollback(): void {
        this.con.rollback()
    }
    commit(): void {
        this.con.commit()
    }
    end(): void {
        this.con.end()
    }

}