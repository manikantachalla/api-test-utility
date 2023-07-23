const fs = require("fs")
const glob = require("glob");
const { dirname } = require("path");
// const { getEntityTestContent } = require("./entity")

const reg = /@Param\(\"[a-zA-Z]*\"\)/g
const reqParamReg = /@RequestParam\(["a-zA-Z=", 0-9-]*\)/g
const mapRegex = /Map<[A-Z][a-z]*\s*,\s*[A-Z][a-z<A-Z]*>{1,3}/g
const listRegex = /List<[A-Z][a-z]*\s*,\s*[A-Z][a-z<A-Z]*>{1,3}/g
let templeteGeneric = /<[A-Z][a-z]*>/

let project = process.argv[2];
const config = {
    "rostertracker": {
        dir: `../Documents/work/prv-ra-java-api/rostertracker/src/main/java`,
        excludefiles: ["Application.java",
            "RosterFileProcessIntermediateStageInfo.java", "InCompatibleError.java", "InCompatibleSheetError.java",
            "BaseRosterFileProcessStageInfo.java", "RASheetDetailsService.java",
            "ExceptionController.java", "AdditionalInfoElement.java"
        ],
        utilPackage: "com.hilabs.rostertracker.utils.TestDataUtil"
    }, "roster-common": {
        dir: `../Documents/work/prv-ra-java-api/roster-common/src/main/java`,
        excludefiles: [],
        utilPackage: "com.hilabs.roster.util.TestUtils"
    }, "rapipeline": {
        dir: `../Documents/work/prv-ra-java-api/rapipeline/src/main/java`,
        excludefiles: ["Application.java"],
        utilPackage: "com.hilabs.rapipeline.util.TestUtils"
    }, "raproviderbid-common": {
        dir: `../Documents/work/prv-ra-java-api/raproviderbid-common/src/main/java`,
        excludefiles: ["Application.java"],
        utilPackage: "com.hilabs.raprovbidirectioncommon.utils.TestDataUtil"
    }
}
let excludefiles = config[project].excludefiles
let allFiles = glob.globSync(config[project].dir + '/**/*');
allFiles = allFiles.filter(f => f.endsWith(".java") && !excludefiles.some(eF => f.endsWith(eF)))
for (let fIndex in allFiles) {
    let file = allFiles[fIndex]
    let content = fs.readFileSync(file).toString();
    let testContent = getTestFileContent(content, file.endsWith("Repository.java") && !file.endsWith("ProcedureRepository.java"),
     (file.endsWith("Entity.java") || content.indexOf("@Entity") != -1) && content.indexOf("@Column") != -1,
     (file.indexOf("dto") != -1 && content.indexOf(".dto") != -1 && content.indexOf(" class ") != -1));
    if (testContent === "") {
        continue;
    }
    let testFile = file.replace("\\main\\", "\\test\\")
    if (!fs.existsSync(dirname(testFile))) {
        fs.mkdirSync(dirname(testFile), { recursive: true })
    }
    testFile = testFile.replace(".java", "Test.java")
    fs.writeFileSync(testFile, testContent);
}

function firstLetterSmall(str) {
    return str.substring(0, 1).toLowerCase() + str.substring(1);
}

function firstLetterCapital(str) {
    return str.substring(0, 1).toUpperCase() + str.substring(1);
}

function getMethodName(part) {
    let ps = part.trim().split(" ");
    let prev = ""
    for (let j in ps) {
        let p = ps[j]
        p = p.trim()
        if (p.indexOf("\(") == -1) {
            prev = p;
            continue
        }
        if (p.indexOf("\(") == 0) {
            return prev;
        } else {
            return p.split("\(")[0];
        }
    }
}


function getTestFileContent(str, isRepository, isEntity, isDTO) {
    let parts = str.split("\n")
    let className = "";
    let publicMethods = []
    let argList = []
    let package = ""
    if (isRepository) {
        parts = parts.map(p => p.replaceAll(reg, "").trim())
        for (let i in parts) {
            let part = parts[i]
            let pLower = part.toLowerCase()
            if (pLower.trim().startsWith("package")) {
                package = part;
            } else if (pLower.indexOf("public interface") != -1 || pLower.indexOf("public abstract") != -1 || pLower.indexOf("public class") != -1) {
                let sP = part.trim().split(" class ")[1];
                if (!sP) {
                    sP = part.trim().split(" interface ")[1];
                }
                className = sP.split(" ")[0].trim()
                className = className.replace(templeteGeneric, "")
            }

            if (part.startsWith('"') || part.startsWith("\/") || part.startsWith("@Query") || part.startsWith("@Lock")
                || part.startsWith("@Modifying") || part.startsWith("@Transactional")
                || part === "" || part.indexOf("\(") == -1) {
                continue;
            }
            let mName = getMethodName(part)
            if (mName === "count") {
                continue;
            }
            publicMethods.push(mName)
            let argPartStr = getArgPartStr(parts, i)
            argList.push(getMArgList(argPartStr))
        }
    } else {
        parts = parts.map(p => p.replaceAll(reqParamReg, ""))
        if (str.indexOf("public interface") != -1) {
            if (str.indexOf("public class") == -1) {
                return ""
            }
        }
        if (str.indexOf("public enum") != -1) {
            return getEnumTestContent(str);
        }
        if (isEntity) {
            return getEntityTestContent(str);
        }

        if (isDTO) {
            return getDTOTestContent(str);
        }

        for (let i in parts) {
            let part = parts[i]
            let pLower = part.toLowerCase()
            if (pLower.trim().startsWith("package")) {
                package = part;
            } else if (pLower.indexOf("public class") != -1) {
                let sP = part.trim().split(" class ")[1];
                className = sP.split(" ")[0].trim()
                className = className.replace(templeteGeneric, "")
            } else if (isPublicMethod(parts, i)) {
                let ps = part.trim().split(" ");
                let prev = ""
                for (let j in ps) {
                    let p = ps[j]
                    p = p.trim()
                    if (p.indexOf("\(") == -1) {
                        prev = p;
                        continue
                    }
                    let argPartStr = getArgPartStr(parts, i)
                    if (p.indexOf("\(") == 0) {
                        publicMethods.push(prev)
                        argList.push(getMArgList(argPartStr))
                    } else {
                        publicMethods.push(p.split("\(")[0])
                        argList.push(getMArgList(argPartStr))
                    }
                    break
                }
            }
        }
    }

    res = package + "\n";
    res += `import org.junit.jupiter.api.Test;
    import org.junit.jupiter.api.extension.ExtendWith;
    import org.mockito.Mock;
    import org.mockito.InjectMocks;
    import org.mockito.junit.jupiter.MockitoExtension;
    import java.util.Collections;
    import static ${config[project].utilPackage}.EMPTY_STR;
    import static ${config[project].utilPackage}.EMPTY_STR;
    import static ${config[project].utilPackage}.SAMPLE_DATE;
    import static org.assertj.core.api.Assertions.assertThat;
    `
    res += "@ExtendWith(MockitoExtension.class)\n"
    res += "public class " + className + "Test \{" + "\n";

    let map = {}
    if (publicMethods.filter(pM => pM !== className).length === 0) {
        publicMethods = publicMethods.length === 0 ? [className] : publicMethods
        if (str.indexOf(`private ${className}()`) != -1 || isRepository) {
            //Do nothing
        } else {
            res += `${isRepository ? "@Mock" : "@InjectMocks"}
            private ${className} ${firstLetterSmall(className)};
            `
            argList = argList.length === 0 ? [[]] : argList;
            let s = new Set()
            for (let pi in publicMethods) {
                let publicMethod = publicMethods[pi]
                let str = `${publicMethod}(${argList[pi].join(", ")})`
                if (s.has(str)) {
                    continue
                }

                res += `@Test
            void test${className}${pi ? pi : ""} () {
                try {
                    new ${publicMethod}(${argList[pi].join(", ")});
                } catch(Exception ex) {
                    //Do nothing   
                }
                assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
            }
            `
                s.add(str)
            }
        }

    } else {
        res += `${isRepository ? "@Mock" : "@InjectMocks"}
private ${className} ${firstLetterSmall(className)};
`
        for (let pi in publicMethods) {
            let publicMethod = publicMethods[pi]
            if (publicMethod === className || publicMethod === "toString") {
                continue
            }
            let suffix = map[publicMethod] ? "" + map[publicMethod] : ""
            res += `@Test
        void ${publicMethod}${suffix} () {
            try {
                ${firstLetterSmall(className)}.${publicMethod}(${argList[pi].join(", ")});
            } catch(Exception ex) {
                //Do nothing   
            }
            assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
        }
        `
            map[publicMethod] = (map[publicMethod] || 0) + 1
        }
    }
    res += "\}"
    return res;
}

function getMArgList(part) {
    if (part.indexOf("\(") != -1 && part.indexOf("\)") != -1 && part.indexOf("\(") < part.indexOf("\)")) {
        let a = part.indexOf("\(");
        let b = part.indexOf("\)");
        let argStr = part.substring(a + 1, b)
        argStr = argStr.replaceAll(mapRegex, "Map")
        argStr = argStr.replaceAll(listRegex, "List")
        let args = argStr.split(",");
        let mArgList = []
        for (let argIndex in args) {
            let arg = args[argIndex]
            if (arg.trim() === "") {
                continue
            }

            if (arg.indexOf(">") != -1 && arg.indexOf("<") == -1) {
                continue
            }
            let aaa = arg.split(" ")[0]
            if (aaa && aaa.endsWith("Exception")) {
                mArgList.push("new " + aaa + "(\"\")");
            } else if (aaa && aaa.trim().endsWith("[]")) {
                mArgList.push("new " + aaa + "{}");
            } else if (arg.trim().startsWith("Map<") || arg.trim().startsWith("HashMap<")) {
                mArgList.push("Collections.EMPTY_MAP");
            } else if (arg.trim().startsWith("List<") || arg.trim().startsWith("ArrayList<")) {
                mArgList.push("Collections.EMPTY_LIST");
            } else if (arg.trim().startsWith("String")) {
                mArgList.push("EMPTY_STR");
            } else if (arg.trim().startsWith("int") || arg.trim().startsWith("Integer")) {
                mArgList.push(1)
            } else if (arg.trim().startsWith("boolean") || arg.trim().startsWith("Boolean")) {
                mArgList.push(true)
            } else if (arg.trim().startsWith("long") || arg.trim().startsWith("Long")) {
                mArgList.push("1L")
            } else if (arg.trim().startsWith("double") || arg.trim().startsWith("Double")) {
                mArgList.push("1.0")
            } else if (arg.trim().startsWith("Date")) {
                mArgList.push("SAMPLE_DATE")
            } else {
                mArgList.push("null")
            }
        }
        return mArgList;
    }
    return [];
}

function getArgPartStr(parts, i, print) {
    let argPartStr = parts[i]
    let pp = parts[i];
    let k = i;
    while (pp.indexOf("\)") == - 1) {
        pp = parts[++k]
        pp = pp.replace(/[\\\n\r]/g, "");
        argPartStr += pp;
    }
    argPartStr = argPartStr.replaceAll("\n", " ")
    argPartStr = argPartStr.replace(reg, "")

    return argPartStr;
}

function isPublicMethod(parts, i) {
    let part = parts[i]
    let pLower = part.toLowerCase()
    if (pLower.indexOf("public") == -1 || pLower.indexOf("\(") == -1) {
        return false;
    }
    let argPartStr = getArgPartStr(parts, i, true);
    return argPartStr.indexOf("{") != -1
}


function getEnumTestContent(str) {
    let package = ""
    let parts = str.split("\n")
    let enumName = ""
    let value = ""
    let methods = []
    for (let i in parts) {
        let part = parts[i]
        let pLower = part.toLowerCase()
        if (pLower.trim().startsWith("package")) {
            package = part;
        } else if (pLower.indexOf("public enum") != -1) {
            let sP = part.trim().split(" enum ")[1];
            enumName = sP.split(" ")[0].trim()
            enumName = enumName.replace(templeteGeneric, "")
        } else if (part.indexOf("public static " + enumName) != -1) {
            let pps = part.split("\(")[0].trim().split(" ");
            methods.push(pps[pps.length - 1])
        } else {
            if (enumName && !value) {
                    value = part.trim().split("\(")[0]
                    value = value.replace(",", "")
            }
        }
    }


    res = package + "\n";
    res += `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Collections;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.SAMPLE_DATE;
import static org.assertj.core.api.Assertions.assertThat;
`
    res += "@ExtendWith(MockitoExtension.class)\n"
    res += "public class " + enumName + "Test \{" + "\n";
    res += str = `@BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }

    @Test
    void name() {
        ${enumName}.${value}.name();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void ordinal() {
        ${enumName}.${value}.ordinal();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testToString() {
        ${enumName}.${value}.toString();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testEquals() {
        ${enumName}.${value}.equals(null);
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testHashCode() {
        ${enumName}.${value}.hashCode();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testClone() {
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void compareTo() {
        ${enumName}.${value}.compareTo(null);
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void getDeclaringClass() {
        ${enumName}.${value}.getDeclaringClass();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void valueOf() {
        ${enumName}.${value}.valueOf("RECEIVED");
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testFinalize() {
        ${enumName}.${value}.valueOf("RECEIVED");
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testToString1() {
        ${enumName}.${value}.toString();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    ${methods.map(m => `@Test
    void ${m}() {
        ${enumName}.${m}("");
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }`).join("\n")}
    

    // @Test
    // void getStatus() {
    //     ${enumName}.${value}.getStatus();
    //     assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    // }

    @Test
    void values() {
        ${enumName}.values();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }

    @Test
    void testValueOf() {
        ${enumName}.valueOf(${enumName}.${value}.name());
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }`
    res += "\}"
    return res;
}

function getEntityTestContent(str) {
    let packageName = ""
    let parts = str.split("\n")
    let entityName = ""
    let value = ""
    let fields = []
    for (let i in parts) {
        let part = parts[i]
        part = part.trim()
        let pLower = part.toLowerCase()
        if (pLower.trim().startsWith("package")) {
            packageName = part;
        } else if (pLower.indexOf("public class") != -1) {
            let sP = part.trim().split(" class ")[1];
            entityName = sP.split(" ")[0].trim()
            entityName = entityName.replace(templeteGeneric, "")
        } else if (part.startsWith("private") && !part.startsWith("private static")) {
            let pps = part.split(" ");
            let fieldName = pps[pps.length - 1];
            fieldName = fieldName.replace(";", "")
            fields.push(firstLetterCapital(fieldName));
        }
    }
    res = packageName + "\n";
    res += `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Collections;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.SAMPLE_DATE;
import static org.assertj.core.api.Assertions.assertThat;
`
    res += "@ExtendWith(MockitoExtension.class)\n"
    res += "public class " + entityName + "Test \{" + "\n";
    res += str = `@BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }
    ${fields.map(field => `@Test
    void get${field}() {
        new ${entityName}().get${field}();
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }`).join("\n")}

    ${fields.map(field => `@Test
    void set${field}() {
        new ${entityName}().set${field}(null);
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }`).join("\n")}

    `
    res += "\}"
    return res;
}


function getDTOTestContent(str) {
    let packageName = ""
    let parts = str.split("\n")
    let entityName = ""
    let value = ""
    let fields = []
    for (let i in parts) {
        let part = parts[i]
        part = part.trim()
        let pLower = part.toLowerCase()
        if (pLower.trim().startsWith("package")) {
            packageName = part;
        } else if (pLower.indexOf("public class") != -1) {
            let sP = part.trim().split(" class ")[1];
            entityName = sP.split(" ")[0].trim()
            entityName = entityName.replace(templeteGeneric, "")
        } else if (part.startsWith("private") && !part.startsWith("private static")) {
            let pps = part.split("=")[0].trim().split(" ");
            let fieldName = pps[pps.length - 1];
            let dataType = pps[pps.length - 2];
            fieldName = fieldName.replace(";", "")
            fields.push([firstLetterCapital(fieldName), dataType]);
        }
    }
    // console.log(fields)
    res = packageName + "\n";
    res += `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Collections;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.EMPTY_STR;
import static ${config[project].utilPackage}.SAMPLE_DATE;
import static org.assertj.core.api.Assertions.assertThat;
`
    res += "@ExtendWith(MockitoExtension.class)\n"
    res += "public class " + entityName + "Test \{" + "\n";
    res += str = `@BeforeEach
    void setUp() {
    }

    @AfterEach
    void tearDown() {
    }
    ${fields.map(field =>{
        let methodName = "get" + field[0];
        if (field[1].trim() === "boolean") {
            const r = /Is[A-Z]\w*/
            methodName = "is" + field[0]
            if (field[0].match(r)) {
                methodName = firstLetterSmall(field[0])
            }
        }
       return  `@Test
        void ${methodName}() {
            new ${entityName}().${methodName}();
            assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
        }`
    }).join("\n")}

    ${fields.map(field =>{ 
        let value = null;
        if (field[1].trim() === "boolean") {
            value = true
        } else if (field[1].trim() === "int") {
            value = 1;
        } else if (field[1].trim() === "long") {
            value = "1L";
        } else if (field[1].trim() === "double") {
            value = 0.0;
        } 
        let methodName = "set" + field[0];
        const r = /Is[A-Z]\w*/
        if (field[1].trim() === "boolean" && field[0].match(r)) {
            methodName = "set" + field[0].substring(2);
        }
        return `@Test
    void ${methodName}() {
        new ${entityName}().${methodName}(${value});
        assertThat(Collections.EMPTY_LIST).usingRecursiveComparison().isEqualTo(Collections.EMPTY_LIST);
    }`}).join("\n")}

    `
    res += "\}"
    return res;
}